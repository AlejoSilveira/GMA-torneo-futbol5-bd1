-- =====================================================================
-- Torneo Interfacultades de Futbol 5 - UCU - Base de Datos 1 (2026)
-- 01_schema.sql: crea la base desde cero (tablas, claves, restricciones)
-- Orden de ejecucion: 01 -> 02 -> 03 -> 04
-- =====================================================================
-- Criterios generales:
--  * Nombres de tablas y columnas = los de la letra. Unica excepcion acordada:
--    contrasena y direccion sin tilde/enie (problemas de encoding en Docker/conector).
--  * Valores de ENUM = los del docs/api.md (sin tildes, con guion bajo).
--  * Todas las FK son RESTRICT (default de MySQL): nada se borra en cascada sin querer.
--  * Las columnas tecnicas agregadas son INVISIBLE: no aparecen en SELECT *,
--    asi que no cambian lo que devuelve la API.
-- =====================================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS torneo_futbol5;
CREATE DATABASE torneo_futbol5 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE torneo_futbol5;

-- ---------------------------------------------------------------------
-- login: usuarios de la aplicacion (no confundir con usuarios MySQL)
-- ---------------------------------------------------------------------
CREATE TABLE login (
    correo      VARCHAR(100) NOT NULL,
    contrasena  VARCHAR(255) NOT NULL,                      -- hash bcrypt, nunca texto plano
    rol         ENUM('administrador', 'planillero') NOT NULL,
    PRIMARY KEY (correo),
    CONSTRAINT chk_login_correo_formato CHECK (correo REGEXP '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
    -- el back busca el correo en minusculas
    CONSTRAINT chk_login_correo_minusculas CHECK (CAST(correo AS BINARY) = CAST(LOWER(correo) AS BINARY)),
    -- formato bcrypt: $2a$/$2b$/$2y$ + costo + 53 caracteres = 60 en total
    CONSTRAINT chk_login_contrasena_bcrypt CHECK (contrasena REGEXP '^[$]2[aby][$][0-9]{2}[$].{53}$')
);

-- ---------------------------------------------------------------------
-- facultad
-- ---------------------------------------------------------------------
CREATE TABLE facultad (
    id_facultad INT          NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(100) NOT NULL,
    PRIMARY KEY (id_facultad),
    CONSTRAINT uq_facultad_nombre UNIQUE (nombre),
    CONSTRAINT chk_facultad_nombre CHECK (TRIM(nombre) <> '')
);

-- ---------------------------------------------------------------------
-- jugador
-- ---------------------------------------------------------------------
CREATE TABLE jugador (
    ci               VARCHAR(8)   NOT NULL,
    nombre           VARCHAR(50)  NOT NULL,
    apellido         VARCHAR(50)  NOT NULL,
    email            VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE         NOT NULL,
    id_facultad      INT          NOT NULL,
    tipo             ENUM('grado', 'posgrado', 'docente', 'funcionario') NOT NULL,
    PRIMARY KEY (ci),
    CONSTRAINT uq_jugador_email UNIQUE (email),
    CONSTRAINT fk_jugador_facultad FOREIGN KEY (id_facultad) REFERENCES facultad (id_facultad),
    CONSTRAINT chk_jugador_ci CHECK (ci REGEXP '^[0-9]{6,8}$'),
    CONSTRAINT chk_jugador_email CHECK (email REGEXP '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
    CONSTRAINT chk_jugador_nombre CHECK (TRIM(nombre) <> '' AND TRIM(apellido) <> ''),
    -- "anterior a hoy" no se puede en un CHECK (CURDATE no es determinista): lo controla el back
    CONSTRAINT chk_jugador_nacimiento CHECK (fecha_nacimiento >= '1900-01-01')
);

-- ---------------------------------------------------------------------
-- torneo: una edicion por semestre, pasa por inscripcion -> en_curso -> finalizado
-- ---------------------------------------------------------------------
CREATE TABLE torneo (
    id_torneo    INT          NOT NULL AUTO_INCREMENT,
    nombre       VARCHAR(100) NOT NULL,
    anio         SMALLINT     NOT NULL,
    semestre     TINYINT      NOT NULL,
    fecha_inicio DATE         NOT NULL,
    fecha_fin    DATE         NOT NULL,
    estado       ENUM('inscripcion', 'en_curso', 'finalizado') NOT NULL DEFAULT 'inscripcion',
    PRIMARY KEY (id_torneo),
    CONSTRAINT chk_torneo_nombre   CHECK (TRIM(nombre) <> ''),
    CONSTRAINT chk_torneo_anio     CHECK (anio BETWEEN 2000 AND 2100),
    CONSTRAINT chk_torneo_semestre CHECK (semestre IN (1, 2)),
    CONSTRAINT chk_torneo_fechas   CHECK (fecha_fin >= fecha_inicio)
);

-- ---------------------------------------------------------------------
-- equipo: ci_capitan es NULL al crear (el plantel esta vacio) y se asigna despues.
-- La FK (id_equipo, ci_capitan) -> plantel se agrega mas abajo, cuando existe el plantel.
-- ---------------------------------------------------------------------
CREATE TABLE equipo (
    id_equipo   INT          NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(100) NOT NULL,
    id_torneo   INT          NOT NULL,
    id_facultad INT          NOT NULL,
    ci_capitan  VARCHAR(8)   NULL,
    PRIMARY KEY (id_equipo),
    -- clave candidata: destino de las FK compuestas (plantel y partido)
    CONSTRAINT uq_equipo_torneo UNIQUE (id_equipo, id_torneo),
    CONSTRAINT uq_equipo_nombre UNIQUE (id_torneo, nombre),
    CONSTRAINT fk_equipo_torneo   FOREIGN KEY (id_torneo)   REFERENCES torneo (id_torneo),
    CONSTRAINT fk_equipo_facultad FOREIGN KEY (id_facultad) REFERENCES facultad (id_facultad),
    CONSTRAINT fk_equipo_capitan_jugador FOREIGN KEY (ci_capitan) REFERENCES jugador (ci),
    CONSTRAINT chk_equipo_nombre CHECK (TRIM(nombre) <> '')
);

-- ---------------------------------------------------------------------
-- equipo_jugador_torneo: el plantel. PK de la letra (id_equipo, ci_jugador, id_torneo).
-- ---------------------------------------------------------------------
CREATE TABLE equipo_jugador_torneo (
    id_equipo       INT              NOT NULL,
    ci_jugador      VARCHAR(8)       NOT NULL,
    id_torneo       INT              NOT NULL,
    numero_camiseta TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (id_equipo, ci_jugador, id_torneo),
    -- regla de la letra: un jugador en un solo equipo por edicion
    CONSTRAINT uq_plantel_jugador_edicion UNIQUE (ci_jugador, id_torneo),
    -- clave candidata: destino de las FK de capitan y planilla
    CONSTRAINT uq_plantel_equipo_jugador UNIQUE (id_equipo, ci_jugador),
    CONSTRAINT uq_plantel_camiseta UNIQUE (id_equipo, numero_camiseta),
    -- FK compuesta: el id_torneo del plantel no puede diferir del torneo del equipo
    CONSTRAINT fk_plantel_equipo  FOREIGN KEY (id_equipo, id_torneo) REFERENCES equipo (id_equipo, id_torneo),
    CONSTRAINT fk_plantel_jugador FOREIGN KEY (ci_jugador) REFERENCES jugador (ci),
    CONSTRAINT chk_plantel_camiseta CHECK (numero_camiseta BETWEEN 1 AND 99)
);

-- el capitan tiene que ser del plantel de SU equipo (y no se lo puede quitar del plantel)
ALTER TABLE equipo
    ADD CONSTRAINT fk_equipo_capitan_plantel
    FOREIGN KEY (id_equipo, ci_capitan) REFERENCES equipo_jugador_torneo (id_equipo, ci_jugador);

-- ---------------------------------------------------------------------
-- complejo y cancha
-- ---------------------------------------------------------------------
CREATE TABLE complejo (
    id_complejo  INT          NOT NULL AUTO_INCREMENT,
    nombre       VARCHAR(100) NOT NULL,
    direccion    VARCHAR(150) NOT NULL,
    departamento VARCHAR(50)  NOT NULL,
    PRIMARY KEY (id_complejo),
    CONSTRAINT chk_complejo_textos CHECK (TRIM(nombre) <> '' AND TRIM(direccion) <> ''),
    -- los 19 departamentos (misma lista que el front); la collation ignora tildes y mayusculas
    CONSTRAINT chk_complejo_departamento CHECK (departamento IN (
        'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida',
        'Lavalleja', 'Maldonado', 'Montevideo', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha',
        'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres'))
);

CREATE TABLE cancha (
    nombre_cancha VARCHAR(50) NOT NULL,
    id_complejo   INT         NOT NULL,
    superficie    ENUM('sintetico', 'parquet') NOT NULL,
    techada       BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (nombre_cancha, id_complejo),
    CONSTRAINT fk_cancha_complejo FOREIGN KEY (id_complejo) REFERENCES complejo (id_complejo),
    CONSTRAINT chk_cancha_nombre CHECK (TRIM(nombre_cancha) <> '')
);

-- ---------------------------------------------------------------------
-- turno: bloques de una hora entre 18:00 y 23:00
-- ---------------------------------------------------------------------
CREATE TABLE turno (
    id_turno    INT  NOT NULL AUTO_INCREMENT,
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    PRIMARY KEY (id_turno),
    CONSTRAINT uq_turno_inicio UNIQUE (hora_inicio),
    CONSTRAINT chk_turno_hora_en_punto CHECK (MINUTE(hora_inicio) = 0 AND SECOND(hora_inicio) = 0),
    CONSTRAINT chk_turno_franja CHECK (hora_inicio BETWEEN '18:00:00' AND '22:00:00'),
    CONSTRAINT chk_turno_una_hora CHECK (hora_fin = ADDTIME(hora_inicio, '01:00:00'))
);

-- ---------------------------------------------------------------------
-- partido. PK de la letra: (id_partido, id_torneo).
-- Columnas calculadas (INVISIBLE) para las reglas "salvo que este cancelado":
--   vigente = 1 si no esta cancelado, NULL si lo esta. Un UNIQUE admite muchos NULL,
--   asi que los partidos cancelados quedan fuera de esas restricciones.
-- ---------------------------------------------------------------------
CREATE TABLE partido (
    id_partido          INT              NOT NULL AUTO_INCREMENT,
    id_torneo           INT              NOT NULL,
    numero_fecha        TINYINT UNSIGNED NOT NULL,
    id_equipo_local     INT              NOT NULL,
    id_equipo_visitante INT              NOT NULL,
    dia                 DATE             NOT NULL,
    id_turno            INT              NOT NULL,
    nombre_cancha       VARCHAR(50)      NOT NULL,
    id_complejo         INT              NOT NULL,
    estado              ENUM('programado', 'jugado', 'postergado', 'cancelado') NOT NULL DEFAULT 'programado',
    vigente      TINYINT AS (IF(estado = 'cancelado', NULL, 1)) STORED INVISIBLE,
    equipo_menor INT     AS (LEAST(id_equipo_local, id_equipo_visitante)) STORED INVISIBLE,
    equipo_mayor INT     AS (GREATEST(id_equipo_local, id_equipo_visitante)) STORED INVISIBLE,
    PRIMARY KEY (id_partido, id_torneo),
    -- id_partido solo ya es unico (autoincremental): lo usan como destino las FK de planilla, gol y tarjeta
    CONSTRAINT uq_partido_id UNIQUE (id_partido),
    -- regla: una cancha no tiene dos partidos el mismo dia y turno (salvo cancelados)
    CONSTRAINT uq_partido_cancha_turno UNIQUE (id_complejo, nombre_cancha, dia, id_turno, vigente),
    -- regla: dos equipos se enfrentan una sola vez por edicion (salvo cancelados), sin importar quien es local
    CONSTRAINT uq_partido_cruce UNIQUE (id_torneo, equipo_menor, equipo_mayor, vigente),
    -- regla: ambos equipos de la misma edicion que el partido (FK compuesta contra equipo)
    CONSTRAINT fk_partido_local     FOREIGN KEY (id_equipo_local, id_torneo)     REFERENCES equipo (id_equipo, id_torneo),
    CONSTRAINT fk_partido_visitante FOREIGN KEY (id_equipo_visitante, id_torneo) REFERENCES equipo (id_equipo, id_torneo),
    CONSTRAINT fk_partido_torneo    FOREIGN KEY (id_torneo) REFERENCES torneo (id_torneo),
    CONSTRAINT fk_partido_turno     FOREIGN KEY (id_turno)  REFERENCES turno (id_turno),
    CONSTRAINT fk_partido_cancha    FOREIGN KEY (nombre_cancha, id_complejo) REFERENCES cancha (nombre_cancha, id_complejo),
    -- regla: un equipo no se enfrenta a si mismo
    CONSTRAINT chk_partido_rivales CHECK (id_equipo_local <> id_equipo_visitante),
    CONSTRAINT chk_partido_fecha   CHECK (numero_fecha BETWEEN 1 AND 50)
);

-- ---------------------------------------------------------------------
-- planilla_partido: quienes jugaron. La FK compuesta contra el plantel
-- garantiza que el jugador sea de ese equipo.
-- ---------------------------------------------------------------------
CREATE TABLE planilla_partido (
    id_partido INT        NOT NULL,
    ci_jugador VARCHAR(8) NOT NULL,
    id_equipo  INT        NOT NULL,
    PRIMARY KEY (id_partido, ci_jugador),
    CONSTRAINT fk_planilla_partido FOREIGN KEY (id_partido) REFERENCES partido (id_partido),
    CONSTRAINT fk_planilla_jugador FOREIGN KEY (ci_jugador) REFERENCES jugador (ci),
    CONSTRAINT fk_planilla_equipo  FOREIGN KEY (id_equipo)  REFERENCES equipo (id_equipo),
    CONSTRAINT fk_planilla_plantel FOREIGN KEY (id_equipo, ci_jugador) REFERENCES equipo_jugador_torneo (id_equipo, ci_jugador)
);

-- ---------------------------------------------------------------------
-- gol y tarjeta: la FK compuesta contra planilla_partido implementa
-- "solo convierten goles o reciben tarjetas los que figuran en la planilla"
-- y ademas impide sacar de la planilla a alguien que ya tiene goles o tarjetas.
-- ---------------------------------------------------------------------
CREATE TABLE gol (
    id_gol     INT              NOT NULL AUTO_INCREMENT,
    id_partido INT              NOT NULL,
    ci_jugador VARCHAR(8)       NOT NULL,
    minuto     TINYINT UNSIGNED NOT NULL,
    autogol    BOOLEAN          NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id_gol),
    CONSTRAINT fk_gol_partido  FOREIGN KEY (id_partido) REFERENCES partido (id_partido),
    CONSTRAINT fk_gol_jugador  FOREIGN KEY (ci_jugador) REFERENCES jugador (ci),
    CONSTRAINT fk_gol_planilla FOREIGN KEY (id_partido, ci_jugador) REFERENCES planilla_partido (id_partido, ci_jugador),
    CONSTRAINT chk_gol_minuto CHECK (minuto BETWEEN 0 AND 60)
);

CREATE TABLE tarjeta (
    id_tarjeta INT              NOT NULL AUTO_INCREMENT,
    id_partido INT              NOT NULL,
    ci_jugador VARCHAR(8)       NOT NULL,
    minuto     TINYINT UNSIGNED NOT NULL,
    color      ENUM('amarilla', 'roja') NOT NULL,
    PRIMARY KEY (id_tarjeta),
    CONSTRAINT fk_tarjeta_partido  FOREIGN KEY (id_partido) REFERENCES partido (id_partido),
    CONSTRAINT fk_tarjeta_jugador  FOREIGN KEY (ci_jugador) REFERENCES jugador (ci),
    CONSTRAINT fk_tarjeta_planilla FOREIGN KEY (id_partido, ci_jugador) REFERENCES planilla_partido (id_partido, ci_jugador),
    CONSTRAINT chk_tarjeta_minuto CHECK (minuto BETWEEN 0 AND 60)
);

-- ---------------------------------------------------------------------
-- sancion_jugador. Atributo agregado: id_tarjeta_origen (INVISIBLE).
--   NULL  -> sancion cargada a mano por un administrador
--   valor -> sancion automatica, creada por un trigger a partir de esa tarjeta
-- ---------------------------------------------------------------------
CREATE TABLE sancion_jugador (
    id_sancion          INT              NOT NULL AUTO_INCREMENT,
    ci_jugador          VARCHAR(8)       NOT NULL,
    id_torneo           INT              NOT NULL,
    motivo              ENUM('roja', 'acumulacion_amarillas', 'disciplinaria') NOT NULL,
    numero_fecha_inicio TINYINT UNSIGNED NOT NULL,
    cantidad_fechas     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    id_tarjeta_origen   INT              NULL INVISIBLE,
    PRIMARY KEY (id_sancion),
    CONSTRAINT uq_sancion_tarjeta_origen UNIQUE (id_tarjeta_origen),
    CONSTRAINT fk_sancion_jugador FOREIGN KEY (ci_jugador) REFERENCES jugador (ci),
    CONSTRAINT fk_sancion_torneo  FOREIGN KEY (id_torneo)  REFERENCES torneo (id_torneo),
    -- solo se sanciona a quien integra un plantel en esa edicion
    CONSTRAINT fk_sancion_plantel FOREIGN KEY (ci_jugador, id_torneo) REFERENCES equipo_jugador_torneo (ci_jugador, id_torneo),
    CONSTRAINT fk_sancion_tarjeta FOREIGN KEY (id_tarjeta_origen) REFERENCES tarjeta (id_tarjeta),
    CONSTRAINT chk_sancion_fecha     CHECK (numero_fecha_inicio BETWEEN 1 AND 50),
    CONSTRAINT chk_sancion_cantidad  CHECK (cantidad_fechas BETWEEN 1 AND 50),
    CONSTRAINT chk_sancion_origen    CHECK (id_tarjeta_origen IS NULL OR motivo <> 'disciplinaria')
);

-- ---------------------------------------------------------------------
-- Indices para los reportes (los demas ya los cubren las PK, UNIQUE y FK)
-- ---------------------------------------------------------------------
-- casi todos los reportes filtran partidos por torneo y estado
CREATE INDEX idx_partido_torneo_estado ON partido (id_torneo, estado, numero_fecha);
-- suspensiones: se buscan por jugador + torneo y rango de fechas
CREATE INDEX idx_sancion_jugador_torneo_fecha ON sancion_jugador (ci_jugador, id_torneo, numero_fecha_inicio);

-- ---------------------------------------------------------------------
-- Datos maestros: los 5 turnos de la letra
-- ---------------------------------------------------------------------
INSERT INTO turno (hora_inicio, hora_fin) VALUES
    ('18:00', '19:00'),
    ('19:00', '20:00'),
    ('20:00', '21:00'),
    ('21:00', '22:00'),
    ('22:00', '23:00');
