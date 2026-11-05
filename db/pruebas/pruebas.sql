-- =====================================================================
-- pruebas/pruebas.sql: prueba cada restriccion y trigger de la base.
-- Correr DESPUES de 01..04, sobre la base recien creada.
-- No deja cambios: todo corre dentro de una transaccion que al final se deshace.
-- (Esta en una subcarpeta para que Docker NO lo ejecute al crear la base.)
--
-- Cada caso indica el error esperado:
--   0     -> tiene que funcionar
--   1644  -> lo rechaza un trigger (SIGNAL)
--   1062  -> UNIQUE          1451/1452 -> FK
--   3819  -> CHECK           1265      -> valor fuera del ENUM
-- Resultado: una tabla con OK / FALLA por caso y un resumen al final.
-- =====================================================================

SET NAMES utf8mb4;
USE torneo_futbol5;

DROP TEMPORARY TABLE IF EXISTS resultado_prueba;
-- MEMORY no es transaccional: los resultados sobreviven al ROLLBACK final
CREATE TEMPORARY TABLE resultado_prueba (
    n         INT AUTO_INCREMENT PRIMARY KEY,
    caso      VARCHAR(150),
    esperado  INT,
    obtenido  INT,
    resultado VARCHAR(5),
    mensaje   VARCHAR(255)
) ENGINE = MEMORY;

DELIMITER $$

DROP PROCEDURE IF EXISTS probar $$
CREATE PROCEDURE probar(IN p_caso VARCHAR(150), IN p_sql VARCHAR(2000), IN p_errno_esperado INT)
BEGIN
    DECLARE v_errno INT DEFAULT 0;
    DECLARE v_msg VARCHAR(255) DEFAULT '';
    -- SQLWARNING tambien: en modo estricto un valor fuera del ENUM sale con SQLSTATE 01000
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION, SQLWARNING
        GET DIAGNOSTICS CONDITION 1 v_errno = MYSQL_ERRNO, v_msg = MESSAGE_TEXT;

    SET @sql_prueba = p_sql;
    PREPARE sentencia FROM @sql_prueba;
    IF v_errno = 0 THEN
        EXECUTE sentencia;
        DEALLOCATE PREPARE sentencia;
    END IF;

    INSERT INTO resultado_prueba (caso, esperado, obtenido, resultado, mensaje)
    VALUES (p_caso, p_errno_esperado, v_errno, IF(v_errno = p_errno_esperado, 'OK', 'FALLA'), v_msg);
END $$

DROP PROCEDURE IF EXISTS afirmar $$
CREATE PROCEDURE afirmar(IN p_caso VARCHAR(150), IN p_condicion BOOLEAN)
BEGIN
    INSERT INTO resultado_prueba (caso, esperado, obtenido, resultado, mensaje)
    VALUES (p_caso, NULL, NULL, IF(p_condicion, 'OK', 'FALLA'), '');
END $$

DELIMITER ;

START TRANSACTION;

-- ---------------------------------------------------------------------
-- Datos de la letra y del script de datos
-- ---------------------------------------------------------------------
CALL afirmar('hay 14 tablas', (SELECT COUNT(*) FROM information_schema.TABLES
                               WHERE TABLE_SCHEMA = 'torneo_futbol5' AND TABLE_TYPE = 'BASE TABLE') = 14);
CALL afirmar('5 turnos de una hora de 18 a 23', (SELECT COUNT(*) FROM turno) = 5);
CALL afirmar('al menos 6 equipos en el torneo en curso', (SELECT COUNT(*) FROM equipo WHERE id_torneo = 2) >= 6);
CALL afirmar('al menos 3 fechas jugadas', (SELECT COUNT(DISTINCT numero_fecha) FROM partido
                                          WHERE id_torneo = 2 AND estado = 'jugado') >= 3);
CALL afirmar('jugadores de los 4 tipos', (SELECT COUNT(DISTINCT tipo) FROM jugador) = 4);
CALL afirmar('partidos postergados y cancelados', (SELECT COUNT(DISTINCT estado) FROM partido
                                                  WHERE estado IN ('postergado', 'cancelado')) = 2);
CALL afirmar('sanciones de los 3 motivos', (SELECT COUNT(DISTINCT motivo) FROM sancion_jugador) = 3);
CALL afirmar('inscriptos que nunca jugaron', (SELECT COUNT(*) FROM equipo_jugador_torneo ejt WHERE ejt.id_torneo = 2
    AND NOT EXISTS (SELECT 1 FROM planilla_partido pp WHERE pp.ci_jugador = ejt.ci_jugador)) >= 2);
CALL afirmar('login de los dos roles', (SELECT COUNT(DISTINCT rol) FROM login) = 2);
CALL afirmar('todas las contrasenas son hash bcrypt', (SELECT COUNT(*) FROM login
                                                     WHERE contrasena NOT LIKE '$2_$%') = 0);
CALL afirmar('planteles validos (5 a 10, max 2 docentes/funcionarios, capitan)', NOT EXISTS (
    SELECT 1 FROM equipo e
    LEFT JOIN equipo_jugador_torneo ejt ON ejt.id_equipo = e.id_equipo
    LEFT JOIN jugador j ON j.ci = ejt.ci_jugador
    GROUP BY e.id_equipo, e.ci_capitan
    HAVING COUNT(ejt.ci_jugador) NOT BETWEEN 5 AND 10
        OR SUM(j.tipo IN ('docente', 'funcionario')) > 2
        OR e.ci_capitan IS NULL));

-- ---------------------------------------------------------------------
-- CHECK y ENUM
-- ---------------------------------------------------------------------
CALL probar('login: contrasena en texto plano',
    'INSERT INTO login VALUES ("nuevo@ucu.edu.uy", "1234", "administrador")', 3819);
CALL probar('login: correo con mayusculas',
    'INSERT INTO login VALUES ("Nuevo@ucu.edu.uy", "$2b$12$Lzfn6v7mYGHuChyHbOb7LuhErMnUrm/vpPY1Ba4by441j2/qY1EjG", "planillero")', 3819);
CALL probar('jugador: CI con letras',
    'INSERT INTO jugador VALUES ("12ab567", "A", "B", "a@b.com", "2000-01-01", 1, "grado")', 3819);
CALL probar('jugador: email sin @',
    'INSERT INTO jugador VALUES ("1234567", "A", "B", "ab.com", "2000-01-01", 1, "grado")', 3819);
CALL probar('jugador: tipo fuera del ENUM',
    'INSERT INTO jugador VALUES ("1234567", "A", "B", "a@b.com", "2000-01-01", 1, "invitado")', 1265);
CALL probar('torneo: semestre 3',
    'INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin) VALUES ("X", 2026, 3, "2026-01-01", "2026-02-01")', 3819);
CALL probar('torneo: fin antes del inicio',
    'INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin) VALUES ("X", 2026, 1, "2026-02-01", "2026-01-01")', 3819);
CALL probar('turno: de dos horas',
    'INSERT INTO turno (hora_inicio, hora_fin) VALUES ("17:00", "19:00")', 3819);
CALL probar('complejo: departamento inexistente',
    'INSERT INTO complejo (nombre, direccion, departamento) VALUES ("X", "Calle 1", "Buenos Aires")', 3819);
CALL probar('complejo: departamento sin tilde ni mayuscula (vale)',
    'INSERT INTO complejo (nombre, direccion, departamento) VALUES ("X", "Calle 1", "paysandu")', 0);
CALL probar('cancha: superficie fuera del ENUM',
    'INSERT INTO cancha VALUES ("Cancha Z", 1, "cesped", FALSE)', 1265);
CALL probar('gol: minuto 61',
    'INSERT INTO gol (id_partido, ci_jugador, minuto) VALUES (13, "51000003", 61)', 3819);

-- ---------------------------------------------------------------------
-- Plantel (torneo 3 en inscripcion, creado para la prueba)
-- ---------------------------------------------------------------------
INSERT INTO jugador VALUES
    ('51990001', 'Prueba', 'Uno',    'p1@correo.ucu.edu.uy', '2003-01-01', 1, 'grado'),
    ('51990002', 'Prueba', 'Dos',    'p2@correo.ucu.edu.uy', '2003-01-01', 1, 'grado'),
    ('51990003', 'Prueba', 'Tres',   'p3@correo.ucu.edu.uy', '2003-01-01', 1, 'grado'),
    ('51990004', 'Prueba', 'Docente','p4@ucu.edu.uy',        '1980-01-01', 1, 'docente'),
    ('51990005', 'Prueba', 'Func',   'p5@ucu.edu.uy',        '1980-01-01', 1, 'funcionario');
INSERT INTO torneo (id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin)
    VALUES (3, 'Torneo de prueba', 2027, 1, '2027-03-01', '2027-06-30');
INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad) VALUES
    (11, 'Prueba A', 3, 1), (12, 'Prueba B', 3, 1), (13, 'Prueba C', 3, 2);
INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta)
SELECT 11, ci, 3, CAST(RIGHT(ci, 1) AS UNSIGNED) FROM jugador WHERE ci BETWEEN '51000001' AND '51000008';
INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta)
SELECT 13, ci, 3, CAST(RIGHT(ci, 1) AS UNSIGNED) FROM jugador WHERE ci BETWEEN '52000001' AND '52000005';

CALL probar('plantel: 2.o docente/funcionario (vale)',
    'INSERT INTO equipo_jugador_torneo VALUES (11, "51990004", 3, 20)', 0);
CALL probar('plantel: 3.er docente/funcionario',
    'INSERT INTO equipo_jugador_torneo VALUES (11, "51990005", 3, 21)', 1644);
CALL probar('plantel: 10.o jugador (vale)',
    'INSERT INTO equipo_jugador_torneo VALUES (11, "51990001", 3, 22)', 0);
CALL probar('plantel: 11.o jugador',
    'INSERT INTO equipo_jugador_torneo VALUES (11, "51990002", 3, 23)', 1644);
CALL probar('plantel: jugador de otra facultad',
    'INSERT INTO equipo_jugador_torneo VALUES (11, "52000006", 3, 24)', 1644);
CALL probar('plantel: mismo jugador en dos equipos de la edicion',
    'INSERT INTO equipo_jugador_torneo VALUES (12, "51000001", 3, 30)', 1062);
CALL probar('plantel: camiseta 100',
    'INSERT INTO equipo_jugador_torneo VALUES (12, "51990003", 3, 100)', 3819);
CALL probar('plantel: alta valida',
    'INSERT INTO equipo_jugador_torneo VALUES (12, "51990003", 3, 5)', 0);
CALL probar('plantel: camiseta repetida en el equipo',
    'INSERT INTO equipo_jugador_torneo VALUES (12, "51990002", 3, 5)', 1062);
INSERT INTO torneo (id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin)
    VALUES (4, 'Otro torneo de prueba', 2027, 2, '2027-08-01', '2027-11-30');
CALL probar('plantel: id_torneo distinto al del equipo',
    'INSERT INTO equipo_jugador_torneo VALUES (12, "51990002", 4, 6)', 1452);
CALL probar('plantel: cambiar de jugador con UPDATE',
    'UPDATE equipo_jugador_torneo SET ci_jugador = "51990002" WHERE id_equipo = 12 AND ci_jugador = "51990003"', 1644);
CALL probar('plantel: cambiar camiseta en inscripcion (vale)',
    'UPDATE equipo_jugador_torneo SET numero_camiseta = 50 WHERE id_equipo = 12 AND ci_jugador = "51990003"', 0);

CALL probar('capitan: jugador de otro equipo',
    'UPDATE equipo SET ci_capitan = "51990003" WHERE id_equipo = 11', 1452);
CALL probar('capitan: jugador del plantel (vale)',
    'UPDATE equipo SET ci_capitan = "51000001" WHERE id_equipo = 11', 0);
CALL probar('capitan: quitarlo del plantel',
    'DELETE FROM equipo_jugador_torneo WHERE id_equipo = 11 AND ci_jugador = "51000001"', 1451);
CALL probar('capitan: crear equipo con capitan que no esta en el plantel',
    'INSERT INTO equipo (nombre, id_torneo, id_facultad, ci_capitan) VALUES ("Prueba D", 3, 1, "51990002")', 1452);

CALL probar('jugador: cambiar facultad de alguien con plantel',
    'UPDATE jugador SET id_facultad = 2 WHERE ci = "51990004"', 1644);
CALL probar('jugador: cambiar tipo de alguien con plantel',
    'UPDATE jugador SET tipo = "grado" WHERE ci = "51000008"', 1644);
CALL probar('jugador: cambiar facultad de alguien sin plantel (vale)',
    'UPDATE jugador SET id_facultad = 2 WHERE ci = "51990005"', 0);
CALL probar('equipo: cambiar facultad con plantel',
    'UPDATE equipo SET id_facultad = 2 WHERE id_equipo = 11', 1644);

-- con el torneo ya en curso (torneo 2)
CALL probar('torneo en curso: inscribir equipo',
    'INSERT INTO equipo (nombre, id_torneo, id_facultad) VALUES ("Tarde FC", 2, 7)', 1644);
CALL probar('torneo en curso: agregar al plantel',
    'INSERT INTO equipo_jugador_torneo VALUES (9, "55000099", 2, 30)', 1644);
CALL probar('torneo en curso: quitar del plantel',
    'DELETE FROM equipo_jugador_torneo WHERE id_equipo = 5 AND ci_jugador = "51000004"', 1644);
CALL probar('torneo en curso: cambiar camiseta',
    'UPDATE equipo_jugador_torneo SET numero_camiseta = 50 WHERE id_equipo = 5 AND ci_jugador = "51000004"', 1644);

-- ---------------------------------------------------------------------
-- Partidos
-- ---------------------------------------------------------------------
CALL probar('partido: equipo contra si mismo',
    'INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     VALUES (2, 6, 5, 5, CURDATE() + INTERVAL 20 DAY, 1, "Cancha B", 2)', 3819);
CALL probar('partido: equipo de otra edicion',
    'INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     VALUES (2, 6, 1, 5, CURDATE() + INTERVAL 20 DAY, 1, "Cancha B", 2)', 1452);
CALL probar('partido: equipo con menos de 5 jugadores',
    'INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     VALUES (3, 1, 11, 12, CURDATE() + INTERVAL 20 DAY, 1, "Cancha B", 2)', 1644);
CALL probar('partido: equipo con dos partidos en la misma fecha',
    'INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     VALUES (2, 5, 5, 6, CURDATE() + INTERVAL 20 DAY, 1, "Cancha B", 2)', 1644);
CALL probar('partido: cruce repetido (con local y visitante invertidos)',
    'INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     VALUES (2, 6, 6, 5, CURDATE() + INTERVAL 20 DAY, 1, "Cancha B", 2)', 1062);
CALL probar('partido: cancha ocupada ese dia y turno',
    'INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     SELECT 3, 1, 11, 13, dia, id_turno, nombre_cancha, id_complejo FROM partido WHERE id_partido = 17', 1062);
CALL probar('partido: cancha de un partido cancelado (vale)',
    'INSERT INTO partido (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     SELECT 100, 3, 1, 11, 13, dia, id_turno, nombre_cancha, id_complejo FROM partido WHERE id_partido = 18', 0);
CALL probar('partido: mismo cruce otra vez',
    'INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     VALUES (3, 2, 13, 11, CURDATE() + INTERVAL 30 DAY, 1, "Cancha B", 2)', 1062);
UPDATE partido SET estado = 'cancelado' WHERE id_partido = 100;
CALL probar('partido: mismo cruce despues de cancelar el anterior (vale)',
    'INSERT INTO partido (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     VALUES (101, 3, 2, 13, 11, CURDATE() + INTERVAL 30 DAY, 1, "Cancha B", 2)', 0);
CALL probar('partido: reactivar un cancelado ya reprogramado (mismos equipos, misma fecha)',
    'UPDATE partido SET estado = "programado" WHERE id_partido = 18', 1644);
CALL probar('partido: marcar jugado uno futuro',
    'UPDATE partido SET estado = "jugado" WHERE id_partido = 17', 1644);
CALL probar('partido: marcar jugado uno de hace dos dias (vale)',
    'UPDATE partido SET dia = CURDATE() - INTERVAL 2 DAY, estado = "jugado" WHERE id_partido = 101', 0);
CALL probar('partido: borrar uno jugado',
    'DELETE FROM partido WHERE id_partido = 7', 1644);
CALL probar('partido: cambiar el turno de uno jugado',
    'UPDATE partido SET id_turno = 1 WHERE id_partido = 7', 1644);
CALL probar('partido: postergar uno programado (vale)',
    'UPDATE partido SET estado = "postergado" WHERE id_partido = 17', 0);
CALL probar('partido: programar en un torneo finalizado',
    'INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
     VALUES (1, 4, 1, 2, CURDATE() + INTERVAL 20 DAY, 1, "Cancha B", 2)', 1644);

-- ---------------------------------------------------------------------
-- Planilla, goles y tarjetas
-- ---------------------------------------------------------------------
CALL probar('planilla: equipo que no juega el partido',
    'INSERT INTO planilla_partido VALUES (21, "51000001", 5)', 1644);
CALL probar('planilla: jugador que no es del plantel',
    'INSERT INTO planilla_partido VALUES (21, "51000001", 6)', 1644);
CALL probar('planilla: suspendido por 3 amarillas (Cabrera, fecha 4)',
    'INSERT INTO planilla_partido VALUES (19, "53000003", 7)', 1644);
CALL probar('planilla: suspendido por disciplinaria (Correa, fecha 2)',
    'INSERT INTO planilla_partido VALUES (12, "54000003", 8)', 1644);
CALL probar('planilla: partido cancelado',
    'INSERT INTO planilla_partido VALUES (18, "53000001", 7)', 1644);
CALL probar('planilla: partido postergado',
    'INSERT INTO planilla_partido VALUES (16, "51000001", 5)', 1644);
CALL probar('planilla: alta valida',
    'INSERT INTO planilla_partido VALUES (21, "52000001", 6)', 0);
CALL probar('gol: jugador que no esta en la planilla',
    'INSERT INTO gol (id_partido, ci_jugador, minuto) VALUES (13, "51000007", 10)', 1644);
CALL probar('tarjeta: jugador que no esta en la planilla',
    'INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (13, "51000007", 10, "amarilla")', 1644);
CALL probar('planilla: quitar a alguien que hizo un gol',
    'DELETE FROM planilla_partido WHERE id_partido = 13 AND ci_jugador = "51000002"', 1451);
CALL probar('planilla: quitar a alguien sin goles ni tarjetas (vale)',
    'DELETE FROM planilla_partido WHERE id_partido = 21 AND ci_jugador = "52000001"', 0);

-- ---------------------------------------------------------------------
-- Sanciones automaticas
-- ---------------------------------------------------------------------
CALL afirmar('roja de la fecha 2 -> suspension en la fecha 3 (Diaz)', EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador = '52000005' AND id_torneo = 2
      AND motivo = 'roja' AND numero_fecha_inicio = 3 AND cantidad_fechas = 1));
CALL afirmar('3.a amarilla en la fecha 3 -> suspension en la fecha 4 (Cabrera)', EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador = '53000003' AND id_torneo = 2
      AND motivo = 'acumulacion_amarillas' AND numero_fecha_inicio = 4));
CALL afirmar('2 amarillas no generan sancion', NOT EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador IN ('52000002', '55000002')));

INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (13, '54000001', 20, 'roja');
SET @roja_prueba = LAST_INSERT_ID();
CALL afirmar('nueva roja -> sancion automatica', EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador = '54000001' AND id_torneo = 2
      AND motivo = 'roja' AND numero_fecha_inicio = 4));
DELETE FROM tarjeta WHERE id_tarjeta = @roja_prueba;
CALL afirmar('borrar la roja -> se borra su sancion', NOT EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador = '54000001'));

UPDATE tarjeta SET color = 'amarilla' WHERE id_partido = 11 AND ci_jugador = '52000005' AND color = 'roja';
CALL afirmar('corregir roja a amarilla -> se borra la suspension', NOT EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador = '52000005'));
CALL afirmar('...y con 2 amarillas no aparece una por acumulacion', NOT EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador = '52000005' AND motivo = 'acumulacion_amarillas'));

DELETE FROM tarjeta WHERE id_partido = 15 AND ci_jugador = '53000003';
CALL afirmar('borrar la 3.a amarilla -> se deshace la acumulacion', NOT EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador = '53000003'));
INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (15, '53000003', 50, 'amarilla');
CALL afirmar('volver a cargarla -> vuelve la acumulacion', EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador = '53000003' AND motivo = 'acumulacion_amarillas'
      AND numero_fecha_inicio = 4));

UPDATE tarjeta SET ci_jugador = '53000001' WHERE id_partido = 15 AND ci_jugador = '53000003';
CALL afirmar('pasar la tarjeta a otro jugador -> se recalculan los dos', NOT EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador IN ('53000003', '53000001')));

CALL afirmar('la sancion disciplinaria no se toca', EXISTS (
    SELECT 1 FROM sancion_jugador WHERE ci_jugador = '54000003' AND motivo = 'disciplinaria'));
CALL probar('sancion: a quien no juega esa edicion',
    'INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio) VALUES ("57000001", 2, "disciplinaria", 4)', 1452);
CALL probar('sancion: disciplinaria a mano (vale)',
    'INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas) VALUES ("56000001", 2, "disciplinaria", 4, 2)', 0);

ROLLBACK;

-- ---------------------------------------------------------------------
-- Resultado
-- ---------------------------------------------------------------------
SELECT n, resultado, caso, esperado, obtenido, mensaje FROM resultado_prueba ORDER BY n;
SELECT COUNT(*) AS casos, SUM(resultado = 'OK') AS ok, SUM(resultado = 'FALLA') AS fallas FROM resultado_prueba;

DROP PROCEDURE probar;
DROP PROCEDURE afirmar;
DROP TEMPORARY TABLE resultado_prueba;
