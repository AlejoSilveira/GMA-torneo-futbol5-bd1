-- =====================================================================
-- 02_triggers.sql: reglas del torneo que no se pueden expresar con
-- PK/FK/UNIQUE/CHECK. Correr despues de 01_schema.sql.
-- =====================================================================
-- Todas las violaciones se informan con SIGNAL SQLSTATE '45000' (errno 1644)
-- y un mensaje en espanol listo para mostrar: el back lo devuelve como 409 tal cual.
--
-- Reglas que quedan SOLO en el back (dependen de la hora actual o son de flujo de pantallas):
--   ventana de 48 h para corregir, dia del partido dentro de las fechas del torneo,
--   orden de las etapas del torneo, quien puede postergar o cancelar.
-- =====================================================================

SET NAMES utf8mb4;
USE torneo_futbol5;

DELIMITER $$

-- =====================================================================
-- PLANTEL (equipo_jugador_torneo)
-- =====================================================================

-- Los planteles solo se modifican con el torneo en inscripcion
DROP PROCEDURE IF EXISTS exigir_inscripcion $$
CREATE PROCEDURE exigir_inscripcion(IN p_id_torneo INT)
BEGIN
    IF (SELECT estado FROM torneo WHERE id_torneo = p_id_torneo) <> 'inscripcion' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Los planteles solo se pueden modificar con el torneo en etapa de inscripción';
    END IF;
END $$

DROP TRIGGER IF EXISTS trg_plantel_bi $$
CREATE TRIGGER trg_plantel_bi BEFORE INSERT ON equipo_jugador_torneo
FOR EACH ROW
BEGIN
    DECLARE v_fac_equipo INT;
    DECLARE v_fac_jugador INT;
    DECLARE v_tipo VARCHAR(20);

    CALL exigir_inscripcion(NEW.id_torneo);

    SELECT id_facultad INTO v_fac_equipo FROM equipo WHERE id_equipo = NEW.id_equipo;
    SELECT id_facultad, tipo INTO v_fac_jugador, v_tipo FROM jugador WHERE ci = NEW.ci_jugador;

    IF v_fac_jugador <> v_fac_equipo THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El jugador tiene que ser de la misma facultad que el equipo';
    END IF;

    IF (SELECT COUNT(*) FROM equipo_jugador_torneo WHERE id_equipo = NEW.id_equipo) >= 10 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El plantel ya tiene 10 jugadores (máximo)';
    END IF;

    IF v_tipo IN ('docente', 'funcionario') AND (
        SELECT COUNT(*)
        FROM equipo_jugador_torneo ejt
        JOIN jugador j ON j.ci = ejt.ci_jugador
        WHERE ejt.id_equipo = NEW.id_equipo AND j.tipo IN ('docente', 'funcionario')
    ) >= 2 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El plantel ya tiene 2 docentes/funcionarios (máximo)';
    END IF;
END $$

-- En un UPDATE solo se cambia el numero de camiseta: cambiar de jugador o de equipo
-- es una baja + un alta (asi pasan por todas las validaciones del INSERT)
DROP TRIGGER IF EXISTS trg_plantel_bu $$
CREATE TRIGGER trg_plantel_bu BEFORE UPDATE ON equipo_jugador_torneo
FOR EACH ROW
BEGIN
    CALL exigir_inscripcion(OLD.id_torneo);
    IF NEW.id_equipo <> OLD.id_equipo OR NEW.ci_jugador <> OLD.ci_jugador OR NEW.id_torneo <> OLD.id_torneo THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'En el plantel solo se puede cambiar el número de camiseta; para cambiar de jugador quitalo y agregá otro';
    END IF;
END $$

-- La baja del capitan la impide la FK fk_equipo_capitan_plantel
DROP TRIGGER IF EXISTS trg_plantel_bd $$
CREATE TRIGGER trg_plantel_bd BEFORE DELETE ON equipo_jugador_torneo
FOR EACH ROW
BEGIN
    CALL exigir_inscripcion(OLD.id_torneo);
END $$

-- =====================================================================
-- EQUIPO
-- =====================================================================

-- No se inscriben equipos en un torneo que ya empezo
DROP TRIGGER IF EXISTS trg_equipo_bi $$
CREATE TRIGGER trg_equipo_bi BEFORE INSERT ON equipo
FOR EACH ROW
BEGIN
    IF (SELECT estado FROM torneo WHERE id_torneo = NEW.id_torneo) <> 'inscripcion' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se pueden inscribir equipos con el torneo en etapa de inscripción';
    END IF;
END $$

-- Si el equipo ya tiene plantel, cambiarle la facultad dejaria jugadores de otra facultad
DROP TRIGGER IF EXISTS trg_equipo_bu $$
CREATE TRIGGER trg_equipo_bu BEFORE UPDATE ON equipo
FOR EACH ROW
BEGIN
    IF NEW.id_facultad <> OLD.id_facultad
       AND EXISTS (SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo = OLD.id_equipo) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede cambiar la facultad de un equipo que ya tiene plantel';
    END IF;
END $$

-- =====================================================================
-- JUGADOR: cambiar facultad o tipo de alguien que integra un plantel
-- romperia las reglas de ese plantel (misma facultad, max 2 docentes/funcionarios)
-- =====================================================================
DROP TRIGGER IF EXISTS trg_jugador_bu $$
CREATE TRIGGER trg_jugador_bu BEFORE UPDATE ON jugador
FOR EACH ROW
BEGIN
    IF (NEW.id_facultad <> OLD.id_facultad OR NEW.tipo <> OLD.tipo)
       AND EXISTS (SELECT 1 FROM equipo_jugador_torneo WHERE ci_jugador = OLD.ci) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede cambiar la facultad o el tipo de un jugador que ya integra un plantel';
    END IF;
END $$

-- =====================================================================
-- PARTIDO
-- =====================================================================

-- Reglas al programar (las demas son PK/FK/UNIQUE/CHECK de la tabla):
--   ambos equipos con al menos 5 jugadores, y ningun equipo con dos partidos en la misma fecha
DROP PROCEDURE IF EXISTS validar_programacion $$
CREATE PROCEDURE validar_programacion(IN p_id_partido INT, IN p_id_torneo INT, IN p_numero_fecha INT,
                                      IN p_local INT, IN p_visitante INT)
BEGIN
    IF (SELECT COUNT(*) FROM equipo_jugador_torneo WHERE id_equipo = p_local) < 5
       OR (SELECT COUNT(*) FROM equipo_jugador_torneo WHERE id_equipo = p_visitante) < 5 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Los dos equipos tienen que tener al menos 5 jugadores en su plantel';
    END IF;

    IF EXISTS (
        SELECT 1 FROM partido
        WHERE id_torneo = p_id_torneo
          AND numero_fecha = p_numero_fecha
          AND estado <> 'cancelado'
          AND id_partido <> COALESCE(p_id_partido, 0)
          AND (id_equipo_local IN (p_local, p_visitante) OR id_equipo_visitante IN (p_local, p_visitante))
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Uno de los equipos ya tiene otro partido en esa fecha del torneo';
    END IF;
END $$

-- Un partido solo puede estar jugado si su dia y turno ya pasaron (hora de Uruguay, UTC-3)
DROP PROCEDURE IF EXISTS exigir_turno_pasado $$
CREATE PROCEDURE exigir_turno_pasado(IN p_dia DATE, IN p_id_turno INT)
BEGIN
    IF TIMESTAMP(p_dia, (SELECT hora_fin FROM turno WHERE id_turno = p_id_turno))
       > CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se puede marcar como jugado cuando ya pasaron su día y turno';
    END IF;
END $$

DROP TRIGGER IF EXISTS trg_partido_bi $$
CREATE TRIGGER trg_partido_bi BEFORE INSERT ON partido
FOR EACH ROW
BEGIN
    IF (SELECT estado FROM torneo WHERE id_torneo = NEW.id_torneo) = 'finalizado' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El torneo ya finalizó, no se pueden programar partidos';
    END IF;
    IF NEW.estado <> 'cancelado' THEN
        CALL validar_programacion(NULL, NEW.id_torneo, NEW.numero_fecha, NEW.id_equipo_local, NEW.id_equipo_visitante);
    END IF;
    IF NEW.estado = 'jugado' THEN
        CALL exigir_turno_pasado(NEW.dia, NEW.id_turno);
    END IF;
END $$

DROP TRIGGER IF EXISTS trg_partido_bu $$
CREATE TRIGGER trg_partido_bu BEFORE UPDATE ON partido
FOR EACH ROW
BEGIN
    -- Un partido jugado queda cerrado: su resultado se corrige en gol/tarjeta, no aca
    IF OLD.estado = 'jugado' AND NOT (
           NEW.estado <=> OLD.estado AND NEW.numero_fecha <=> OLD.numero_fecha
       AND NEW.id_equipo_local <=> OLD.id_equipo_local AND NEW.id_equipo_visitante <=> OLD.id_equipo_visitante
       AND NEW.dia <=> OLD.dia AND NEW.id_turno <=> OLD.id_turno
       AND NEW.nombre_cancha <=> OLD.nombre_cancha AND NEW.id_complejo <=> OLD.id_complejo) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Un partido jugado no se puede modificar';
    END IF;

    -- Si cambian los equipos o la fecha (o se reactiva), se vuelve a validar la programacion
    IF NEW.estado <> 'cancelado' AND (
           NEW.id_equipo_local <> OLD.id_equipo_local OR NEW.id_equipo_visitante <> OLD.id_equipo_visitante
        OR NEW.numero_fecha <> OLD.numero_fecha OR OLD.estado = 'cancelado') THEN
        CALL validar_programacion(OLD.id_partido, NEW.id_torneo, NEW.numero_fecha,
                                  NEW.id_equipo_local, NEW.id_equipo_visitante);
    END IF;

    IF NEW.estado = 'jugado' AND OLD.estado <> 'jugado' THEN
        CALL exigir_turno_pasado(NEW.dia, NEW.id_turno);
    END IF;
END $$

DROP TRIGGER IF EXISTS trg_partido_bd $$
CREATE TRIGGER trg_partido_bd BEFORE DELETE ON partido
FOR EACH ROW
BEGIN
    IF OLD.estado = 'jugado' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Un partido jugado no se puede eliminar';
    END IF;
END $$

-- =====================================================================
-- PLANILLA: solo jugadores del plantel de uno de los dos equipos, no suspendidos,
-- y nunca en partidos cancelados o postergados.
-- (que el jugador sea de ESE plantel tambien lo garantiza la FK fk_planilla_plantel;
--  el trigger va antes para dar un mensaje claro)
-- =====================================================================
DROP PROCEDURE IF EXISTS validar_planilla $$
CREATE PROCEDURE validar_planilla(IN p_id_partido INT, IN p_ci VARCHAR(8), IN p_id_equipo INT)
BEGIN
    DECLARE v_torneo INT;
    DECLARE v_fecha INT;
    DECLARE v_estado VARCHAR(20);
    DECLARE v_local INT;
    DECLARE v_visitante INT;

    SELECT id_torneo, numero_fecha, estado, id_equipo_local, id_equipo_visitante
      INTO v_torneo, v_fecha, v_estado, v_local, v_visitante
    FROM partido WHERE id_partido = p_id_partido;

    IF v_estado IN ('cancelado', 'postergado') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El partido está cancelado o postergado, no se le puede cargar planilla';
    END IF;

    IF p_id_equipo NOT IN (v_local, v_visitante) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El equipo no juega este partido';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo = p_id_equipo AND ci_jugador = p_ci) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El jugador no está en el plantel de ese equipo';
    END IF;

    IF EXISTS (
        SELECT 1 FROM sancion_jugador
        WHERE ci_jugador = p_ci
          AND id_torneo = v_torneo
          AND v_fecha BETWEEN numero_fecha_inicio AND numero_fecha_inicio + cantidad_fechas - 1
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El jugador está suspendido para esta fecha';
    END IF;
END $$

DROP TRIGGER IF EXISTS trg_planilla_bi $$
CREATE TRIGGER trg_planilla_bi BEFORE INSERT ON planilla_partido
FOR EACH ROW
BEGIN
    CALL validar_planilla(NEW.id_partido, NEW.ci_jugador, NEW.id_equipo);
END $$

DROP TRIGGER IF EXISTS trg_planilla_bu $$
CREATE TRIGGER trg_planilla_bu BEFORE UPDATE ON planilla_partido
FOR EACH ROW
BEGIN
    CALL validar_planilla(NEW.id_partido, NEW.ci_jugador, NEW.id_equipo);
END $$

-- =====================================================================
-- GOL y TARJETA: el que convierte o recibe la tarjeta tiene que figurar en la planilla.
-- Lo garantiza la FK compuesta contra planilla_partido; el trigger da el mensaje claro.
-- =====================================================================
DROP PROCEDURE IF EXISTS exigir_en_planilla $$
CREATE PROCEDURE exigir_en_planilla(IN p_id_partido INT, IN p_ci VARCHAR(8))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM planilla_partido WHERE id_partido = p_id_partido AND ci_jugador = p_ci) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El jugador no figura en la planilla de este partido';
    END IF;
END $$

DROP TRIGGER IF EXISTS trg_gol_bi $$
CREATE TRIGGER trg_gol_bi BEFORE INSERT ON gol
FOR EACH ROW
BEGIN
    CALL exigir_en_planilla(NEW.id_partido, NEW.ci_jugador);
END $$

DROP TRIGGER IF EXISTS trg_gol_bu $$
CREATE TRIGGER trg_gol_bu BEFORE UPDATE ON gol
FOR EACH ROW
BEGIN
    CALL exigir_en_planilla(NEW.id_partido, NEW.ci_jugador);
END $$

DROP TRIGGER IF EXISTS trg_tarjeta_bi $$
CREATE TRIGGER trg_tarjeta_bi BEFORE INSERT ON tarjeta
FOR EACH ROW
BEGIN
    CALL exigir_en_planilla(NEW.id_partido, NEW.ci_jugador);
END $$

DROP TRIGGER IF EXISTS trg_tarjeta_bu $$
CREATE TRIGGER trg_tarjeta_bu BEFORE UPDATE ON tarjeta
FOR EACH ROW
BEGIN
    CALL exigir_en_planilla(NEW.id_partido, NEW.ci_jugador);
END $$

DELIMITER ;

-- =====================================================================
-- SANCIONES AUTOMATICAS
-- Regla: roja -> 1 fecha de suspension; cada 3 amarillas acumuladas en la edicion -> 1 fecha.
-- Se cumplen en la fecha siguiente a la del partido de la tarjeta.
--
-- Diseno: en vez de "sumar" en cada INSERT, la vista dice que sanciones automaticas
-- DEBERIAN existir segun las tarjetas cargadas, y el procedimiento sincroniza la tabla
-- con la vista. Asi el mismo codigo sirve para alta, correccion y borrado de tarjetas.
-- =====================================================================
CREATE OR REPLACE VIEW v_sancion_automatica_esperada AS
SELECT x.ci_jugador,
       x.id_torneo,
       x.id_tarjeta,
       IF(x.color = 'roja', 'roja', 'acumulacion_amarillas') AS motivo,
       x.numero_fecha + 1 AS numero_fecha_inicio
FROM (
    SELECT t.ci_jugador, p.id_torneo, t.id_tarjeta, t.color, p.numero_fecha,
           -- numero de amarilla del jugador en la edicion (1.a, 2.a, 3.a...) en orden cronologico
           ROW_NUMBER() OVER (PARTITION BY t.ci_jugador, p.id_torneo, t.color
                              ORDER BY p.numero_fecha, t.minuto, t.id_tarjeta) AS n
    FROM tarjeta t
    JOIN partido p ON p.id_partido = t.id_partido
) x
WHERE x.color = 'roja' OR MOD(x.n, 3) = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS recalcular_sanciones_automaticas $$
CREATE PROCEDURE recalcular_sanciones_automaticas(IN p_ci VARCHAR(8), IN p_id_torneo INT)
BEGIN
    -- 1) borra las automaticas que ya no corresponden (tarjeta borrada, cambiada de color o de jugador)
    DELETE FROM sancion_jugador
    WHERE ci_jugador = p_ci
      AND id_torneo = p_id_torneo
      AND id_tarjeta_origen IS NOT NULL
      AND (id_tarjeta_origen, motivo) NOT IN (
          SELECT id_tarjeta, motivo FROM v_sancion_automatica_esperada
          WHERE ci_jugador = p_ci AND id_torneo = p_id_torneo);

    -- 2) crea las que faltan (las que ya existen no se tocan: se respetan cambios del administrador)
    INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, id_tarjeta_origen)
    SELECT e.ci_jugador, e.id_torneo, e.motivo, e.numero_fecha_inicio, 1, e.id_tarjeta
    FROM v_sancion_automatica_esperada e
    WHERE e.ci_jugador = p_ci
      AND e.id_torneo = p_id_torneo
      AND NOT EXISTS (SELECT 1 FROM sancion_jugador s WHERE s.id_tarjeta_origen = e.id_tarjeta);
END $$

DROP TRIGGER IF EXISTS trg_tarjeta_ai $$
CREATE TRIGGER trg_tarjeta_ai AFTER INSERT ON tarjeta
FOR EACH ROW
BEGIN
    CALL recalcular_sanciones_automaticas(NEW.ci_jugador,
        (SELECT id_torneo FROM partido WHERE id_partido = NEW.id_partido));
END $$

DROP TRIGGER IF EXISTS trg_tarjeta_au $$
CREATE TRIGGER trg_tarjeta_au AFTER UPDATE ON tarjeta
FOR EACH ROW
BEGIN
    DECLARE v_torneo INT;
    SELECT id_torneo INTO v_torneo FROM partido WHERE id_partido = NEW.id_partido;
    CALL recalcular_sanciones_automaticas(NEW.ci_jugador, v_torneo);
    IF OLD.ci_jugador <> NEW.ci_jugador THEN
        CALL recalcular_sanciones_automaticas(OLD.ci_jugador, v_torneo);
    END IF;
END $$

-- Antes de borrar la tarjeta se borra la sancion que genero (si no, la FK lo impide);
-- despues se recalcula, porque sacar una amarilla puede deshacer una acumulacion
DROP TRIGGER IF EXISTS trg_tarjeta_bd $$
CREATE TRIGGER trg_tarjeta_bd BEFORE DELETE ON tarjeta
FOR EACH ROW
BEGIN
    DELETE FROM sancion_jugador WHERE id_tarjeta_origen = OLD.id_tarjeta;
END $$

DROP TRIGGER IF EXISTS trg_tarjeta_ad $$
CREATE TRIGGER trg_tarjeta_ad AFTER DELETE ON tarjeta
FOR EACH ROW
BEGIN
    CALL recalcular_sanciones_automaticas(OLD.ci_jugador,
        (SELECT id_torneo FROM partido WHERE id_partido = OLD.id_partido));
END $$

DELIMITER ;
