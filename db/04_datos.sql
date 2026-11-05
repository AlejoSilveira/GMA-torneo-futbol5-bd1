-- =====================================================================
-- 04_datos.sql: datos de prueba (ficticios) para probar la aplicacion
-- y que todos los reportes devuelvan filas. Correr despues de 01, 02 y 03.
-- =====================================================================
-- Todas las personas, cedulas y complejos son inventados.
--
-- Las fechas son RELATIVAS al dia en que se corre el script (@hoy, hora de Uruguay):
-- asi siempre hay partidos jugados ayer (se pueden corregir dentro de las 48 h)
-- y partidos futuros por programar, aunque la base se cree el dia de la defensa.
--
-- Contenido:
--   * 7 facultades, 48 jugadores de los 4 tipos (CI = 5 + facultad + numero)
--   * Torneo 1 (1.er semestre, finalizado): 4 equipos, 6 partidos jugados
--   * Torneo 2 (2.o semestre, en curso): 6 equipos, 16 partidos
--       fechas 1-3 jugadas (9 partidos), fecha 4 con un postergado y un cancelado
--       (re-programado como partido nuevo), fecha 5 programada
--   * Sanciones de los 3 motivos (roja y 3 amarillas las crea el trigger)
--   * Jugadores inscriptos que nunca jugaron, un 0-0, un autogol
--   * Usuarios de login de los dos roles (contrasenas en el README, solo para pruebas)
--
-- El orden de los INSERT respeta las reglas, porque los triggers estan activos:
-- torneo en inscripcion -> equipos -> planteles -> capitanes -> en_curso -> partidos -> planillas.
-- =====================================================================

SET NAMES utf8mb4;
USE torneo_futbol5;

SET @hoy = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00'));

-- ---------------------------------------------------------------------
-- Usuarios de la aplicacion (hash bcrypt, costo 12)
--   admin@ucu.edu.uy / Admin2026!            planillero@ucu.edu.uy / Planillero2026!
-- ---------------------------------------------------------------------
INSERT INTO login (correo, contrasena, rol) VALUES
    ('admin@ucu.edu.uy',      '$2b$12$Lzfn6v7mYGHuChyHbOb7LuhErMnUrm/vpPY1Ba4by441j2/qY1EjG', 'administrador'),
    ('planillero@ucu.edu.uy', '$2b$12$N2rQiWynRcxIatHBRK9u9.sNReaKjVaq4XyTqOqqbWt0HpOX92L0S', 'planillero');

-- ---------------------------------------------------------------------
-- Facultades
-- ---------------------------------------------------------------------
INSERT INTO facultad (id_facultad, nombre) VALUES
    (1, 'Ingeniería y Tecnologías'),
    (2, 'Ciencias Empresariales'),
    (3, 'Derecho'),
    (4, 'Psicología'),
    (5, 'Ciencias de la Salud'),
    (6, 'Ciencias Humanas'),
    (7, 'Enfermería y Tecnologías de la Salud');   -- sin equipo: aparece solo en el reporte por facultad

-- ---------------------------------------------------------------------
-- Jugadores
-- ---------------------------------------------------------------------
INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo) VALUES
    -- Ingenieria y Tecnologias
    ('51000001', 'Martín',     'Rodríguez',  'martin.rodriguez@correo.ucu.edu.uy',  '2002-03-14', 1, 'grado'),
    ('51000002', 'Sofía',      'Martínez',   'sofia.martinez@correo.ucu.edu.uy',    '2003-07-22', 1, 'grado'),
    ('51000003', 'Juan',       'Pérez',      'juan.perez@correo.ucu.edu.uy',        '2001-11-05', 1, 'grado'),
    ('51000004', 'Tomás',      'Fernández',  'tomas.fernandez@correo.ucu.edu.uy',   '2004-01-30', 1, 'grado'),
    ('51000005', 'Valentina',  'López',      'valentina.lopez@correo.ucu.edu.uy',   '1997-09-12', 1, 'posgrado'),
    ('51000006', 'Diego',      'Sosa',       'diego.sosa@correo.ucu.edu.uy',        '2003-05-18', 1, 'grado'),
    ('51000007', 'Camila',     'Ferreira',   'camila.ferreira@correo.ucu.edu.uy',   '2005-02-09', 1, 'grado'),
    ('51000008', 'Andrés',     'Castro',     'andres.castro@ucu.edu.uy',            '1981-06-25', 1, 'docente'),
    -- Ciencias Empresariales
    ('52000001', 'Agustín',    'Pereira',    'agustin.pereira@correo.ucu.edu.uy',   '2002-08-03', 2, 'grado'),
    ('52000002', 'Lucía',      'Gómez',      'lucia.gomez@correo.ucu.edu.uy',       '2003-12-11', 2, 'grado'),
    ('52000003', 'Florencia',  'Silva',      'florencia.silva@correo.ucu.edu.uy',   '2004-04-27', 2, 'grado'),
    ('52000004', 'Nicolás',    'Acosta',     'nicolas.acosta@correo.ucu.edu.uy',    '2002-10-19', 2, 'grado'),
    ('52000005', 'Matías',     'Díaz',       'matias.diaz@correo.ucu.edu.uy',       '2003-02-14', 2, 'grado'),
    ('52000006', 'Federico',   'Benítez',    'federico.benitez@correo.ucu.edu.uy',  '1996-05-30', 2, 'posgrado'),
    ('52000007', 'Laura',      'Méndez',     'laura.mendez@ucu.edu.uy',             '1988-09-08', 2, 'funcionario'),
    ('52000008', 'Rodrigo',    'Suárez',     'rodrigo.suarez@correo.ucu.edu.uy',    '2005-06-01', 2, 'grado'),
    -- Derecho
    ('53000001', 'Joaquín',    'Núñez',      'joaquin.nunez@correo.ucu.edu.uy',     '2001-09-23', 3, 'grado'),
    ('53000002', 'Micaela',    'Ramos',      'micaela.ramos@correo.ucu.edu.uy',     '2004-03-16', 3, 'grado'),
    ('53000003', 'Santiago',   'Cabrera',    'santiago.cabrera@correo.ucu.edu.uy',  '2002-12-02', 3, 'grado'),
    ('53000004', 'Bruno',      'Olivera',    'bruno.olivera@correo.ucu.edu.uy',     '2003-08-29', 3, 'grado'),
    ('53000005', 'Paula',      'Vázquez',    'paula.vazquez@correo.ucu.edu.uy',     '1995-11-14', 3, 'posgrado'),
    ('53000006', 'Gonzalo',    'Pintos',     'gonzalo.pintos@correo.ucu.edu.uy',    '2004-07-07', 3, 'grado'),
    ('53000007', 'Ana Laura',  'Rocha',      'analaura.rocha@ucu.edu.uy',           '1979-04-18', 3, 'docente'),
    -- Psicologia
    ('54000001', 'Facundo',    'Morales',    'facundo.morales@correo.ucu.edu.uy',   '2002-01-12', 4, 'grado'),
    ('54000002', 'Carolina',   'Viera',      'carolina.viera@correo.ucu.edu.uy',    '2003-10-05', 4, 'grado'),
    ('54000003', 'Emiliano',   'Correa',     'emiliano.correa@correo.ucu.edu.uy',   '2004-06-21', 4, 'grado'),
    ('54000004', 'Julieta',    'Techera',    'julieta.techera@correo.ucu.edu.uy',   '2003-03-03', 4, 'grado'),
    ('54000005', 'Ignacio',    'Bentancur',  'ignacio.bentancur@correo.ucu.edu.uy', '2002-05-26', 4, 'grado'),
    ('54000006', 'Mariana',    'Cardozo',    'mariana.cardozo@correo.ucu.edu.uy',   '1994-12-09', 4, 'posgrado'),
    ('54000007', 'Gustavo',    'Rivero',     'gustavo.rivero@ucu.edu.uy',           '1985-08-17', 4, 'funcionario'),
    ('54000008', 'Pablo',      'Duarte',     'pablo.duarte@ucu.edu.uy',             '1983-02-28', 4, 'docente'),
    -- Ciencias de la Salud
    ('55000001', 'Sebastián',  'Medina',     'sebastian.medina@correo.ucu.edu.uy',  '2001-04-04', 5, 'grado'),
    ('55000002', 'Victoria',   'Alonso',     'victoria.alonso@correo.ucu.edu.uy',   '2003-09-15', 5, 'grado'),
    ('55000003', 'Leandro',    'Giménez',    'leandro.gimenez@correo.ucu.edu.uy',   '2002-11-28', 5, 'grado'),
    ('55000004', 'Romina',     'Ortiz',      'romina.ortiz@correo.ucu.edu.uy',      '2004-02-17', 5, 'grado'),
    ('55000005', 'Maximiliano','Barrios',    'maximiliano.barrios@correo.ucu.edu.uy','2003-06-08', 5, 'grado'),
    ('55000006', 'Natalia',    'Rosas',      'natalia.rosas@correo.ucu.edu.uy',     '1996-10-21', 5, 'posgrado'),
    ('55000007', 'Daniel',     'Ferraro',    'daniel.ferraro@ucu.edu.uy',           '1980-01-13', 5, 'docente'),
    -- Ciencias Humanas
    ('56000001', 'Lucas',      'Varela',     'lucas.varela@correo.ucu.edu.uy',      '2002-07-31', 6, 'grado'),
    ('56000002', 'Agustina',   'Pereyra',    'agustina.pereyra@correo.ucu.edu.uy',  '2003-04-12', 6, 'grado'),
    ('56000003', 'Felipe',     'Arias',      'felipe.arias@correo.ucu.edu.uy',      '2004-09-09', 6, 'grado'),
    ('56000004', 'Rocío',      'Machado',    'rocio.machado@correo.ucu.edu.uy',     '2002-02-24', 6, 'grado'),
    ('56000005', 'Kevin',      'Da Silva',   'kevin.dasilva@correo.ucu.edu.uy',     '2003-11-30', 6, 'grado'),
    ('56000006', 'Lorena',     'Sanguinetti','lorena.sanguinetti@ucu.edu.uy',       '1987-03-19', 6, 'funcionario'),
    ('56000007', 'Mauricio',   'Lema',       'mauricio.lema@correo.ucu.edu.uy',     '2005-01-06', 6, 'grado'),
    -- Enfermeria (sin equipo)
    ('57000001', 'Carla',      'Ibarra',     'carla.ibarra@correo.ucu.edu.uy',      '2004-08-14', 7, 'grado'),
    ('57000002', 'Valeria',    'Peña',       'valeria.pena@correo.ucu.edu.uy',      '2003-05-02', 7, 'grado'),
    ('57000003', 'Hernán',     'Sequeira',   'hernan.sequeira@ucu.edu.uy',          '1978-10-27', 7, 'docente');

-- ---------------------------------------------------------------------
-- Complejos y canchas
-- ---------------------------------------------------------------------
INSERT INTO complejo (id_complejo, nombre, direccion, departamento) VALUES
    (1, 'Complejo Deportivo La Blanqueada', 'Av. 8 de Octubre 3120', 'Montevideo'),
    (2, 'Fútbol 5 Parque Rodó',             'Bv. España 2650',       'Montevideo'),
    (3, 'Canchas del Lago',                 'Av. Giannattasio km 21', 'Canelones');

INSERT INTO cancha (nombre_cancha, id_complejo, superficie, techada) VALUES
    ('Cancha 1',       1, 'sintetico', TRUE),
    ('Cancha 2',       1, 'sintetico', FALSE),
    ('Cancha A',       2, 'parquet',   TRUE),
    ('Cancha B',       2, 'sintetico', FALSE),
    ('Cancha Central', 3, 'sintetico', FALSE);

-- =====================================================================
-- TORNEO 1: 1.er semestre 2026 (finalizado)
-- =====================================================================
INSERT INTO torneo (id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin, estado) VALUES
    (1, 'Torneo Interfacultades 2026 - 1.er semestre', 2026, 1,
     DATE_SUB(@hoy, INTERVAL 200 DAY), DATE_SUB(@hoy, INTERVAL 170 DAY), 'inscripcion');

INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad, ci_capitan) VALUES
    (1, 'Ingeniería FC',  1, 1, NULL),
    (2, 'Los Contadores', 1, 2, NULL),
    (3, 'Derecho United', 1, 3, NULL),
    (4, 'Psico Team',     1, 4, NULL);

INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta) VALUES
    (1, '51000001', 1, 1), (1, '51000002', 1, 10), (1, '51000003', 1, 9), (1, '51000004', 1, 7),
    (1, '51000006', 1, 8), (1, '51000008', 1, 5),
    (2, '52000001', 1, 1), (2, '52000002', 1, 10), (2, '52000003', 1, 9), (2, '52000004', 1, 4),
    (2, '52000008', 1, 7),
    (3, '53000001', 1, 1), (3, '53000003', 1, 6), (3, '53000004', 1, 9), (3, '53000005', 1, 3),
    (3, '53000006', 1, 11),
    (4, '54000001', 1, 1), (4, '54000002', 1, 10), (4, '54000004', 1, 8), (4, '54000005', 1, 9),
    (4, '54000006', 1, 4);

UPDATE equipo SET ci_capitan = '51000001' WHERE id_equipo = 1;
UPDATE equipo SET ci_capitan = '52000001' WHERE id_equipo = 2;
UPDATE equipo SET ci_capitan = '53000001' WHERE id_equipo = 3;
UPDATE equipo SET ci_capitan = '54000001' WHERE id_equipo = 4;

UPDATE torneo SET estado = 'en_curso' WHERE id_torneo = 1;

-- Liga a una rueda entre 4 equipos: 3 fechas de 2 partidos
INSERT INTO partido (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante,
                     dia, id_turno, nombre_cancha, id_complejo, estado) VALUES
    (1, 1, 1, 1, 2, DATE_SUB(@hoy, INTERVAL 190 DAY), 1, 'Cancha 1', 1, 'jugado'),
    (2, 1, 1, 3, 4, DATE_SUB(@hoy, INTERVAL 190 DAY), 1, 'Cancha 2', 1, 'jugado'),
    (3, 1, 2, 1, 3, DATE_SUB(@hoy, INTERVAL 183 DAY), 3, 'Cancha A', 2, 'jugado'),
    (4, 1, 2, 2, 4, DATE_SUB(@hoy, INTERVAL 183 DAY), 4, 'Cancha A', 2, 'jugado'),
    (5, 1, 3, 1, 4, DATE_SUB(@hoy, INTERVAL 176 DAY), 2, 'Cancha 1', 1, 'jugado'),
    (6, 1, 3, 2, 3, DATE_SUB(@hoy, INTERVAL 176 DAY), 2, 'Cancha 2', 1, 'jugado');

-- En este torneo jugaron todos los inscriptos en todos los partidos
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT p.id_partido, ejt.ci_jugador, ejt.id_equipo
FROM partido p
JOIN equipo_jugador_torneo ejt ON ejt.id_equipo IN (p.id_equipo_local, p.id_equipo_visitante)
WHERE p.id_torneo = 1;

INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES
    (1, '51000003', 15, FALSE), (1, '51000001', 40, FALSE), (1, '52000002', 33, FALSE),   -- 2-1
    (2, '53000001', 20, FALSE), (2, '54000001', 44, FALSE),                               -- 1-1
    (3, '53000004', 28, FALSE),                                                           -- 0-1
    (4, '52000001', 10, FALSE), (4, '52000001', 25, FALSE), (4, '52000003', 50, FALSE),   -- 3-2
    (4, '54000002',  5, FALSE), (4, '54000005', 47, FALSE),
    (5, '51000002', 12, FALSE), (5, '51000006', 38, FALSE),                               -- 2-2
    (5, '54000004', 22, FALSE), (5, '54000001', 56, FALSE),
    (6, '52000004', 41, FALSE);                                                           -- 1-0

INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES
    (3, '53000006', 12, 'amarilla'),
    (4, '52000001', 30, 'amarilla');

UPDATE torneo SET estado = 'finalizado' WHERE id_torneo = 1;

-- =====================================================================
-- TORNEO 2: 2.o semestre 2026 (en curso)
-- =====================================================================
INSERT INTO torneo (id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin, estado) VALUES
    (2, 'Torneo Interfacultades 2026 - 2.o semestre', 2026, 2,
     DATE_SUB(@hoy, INTERVAL 20 DAY), DATE_ADD(@hoy, INTERVAL 30 DAY), 'inscripcion');

INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad, ci_capitan) VALUES
    (5,  'Ingeniería FC',  2, 1, NULL),
    (6,  'Los Contadores', 2, 2, NULL),
    (7,  'Derecho United', 2, 3, NULL),
    (8,  'Psico Team',     2, 4, NULL),
    (9,  'Salud Total',    2, 5, NULL),
    (10, 'Humanas FC',     2, 6, NULL);

-- Planteles de 7 u 8 jugadores, como maximo 2 docentes/funcionarios por equipo
INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta) VALUES
    (5,  '51000001', 2, 1), (5,  '51000002', 2, 10), (5,  '51000003', 2, 9), (5,  '51000004', 2, 7),
    (5,  '51000005', 2, 4), (5,  '51000006', 2, 8),  (5,  '51000007', 2, 11), (5, '51000008', 2, 5),
    (6,  '52000001', 2, 1), (6,  '52000002', 2, 10), (6,  '52000003', 2, 9), (6,  '52000004', 2, 4),
    (6,  '52000005', 2, 6), (6,  '52000006', 2, 3),  (6,  '52000007', 2, 2), (6,  '52000008', 2, 7),
    (7,  '53000001', 2, 1), (7,  '53000002', 2, 12), (7,  '53000003', 2, 6), (7,  '53000004', 2, 9),
    (7,  '53000005', 2, 3), (7,  '53000006', 2, 11), (7,  '53000007', 2, 5),
    (8,  '54000001', 2, 1), (8,  '54000002', 2, 10), (8,  '54000003', 2, 6), (8,  '54000004', 2, 8),
    (8,  '54000005', 2, 9), (8,  '54000006', 2, 4),  (8,  '54000007', 2, 2), (8,  '54000008', 2, 5),
    (9,  '55000001', 2, 9), (9,  '55000002', 2, 10), (9,  '55000003', 2, 7), (9,  '55000004', 2, 8),
    (9,  '55000005', 2, 1), (9,  '55000006', 2, 4),  (9,  '55000007', 2, 5),
    (10, '56000001', 2, 10), (10, '56000002', 2, 7), (10, '56000003', 2, 9), (10, '56000004', 2, 1),
    (10, '56000005', 2, 8), (10, '56000006', 2, 2),  (10, '56000007', 2, 11);

UPDATE equipo SET ci_capitan = '51000001' WHERE id_equipo = 5;
UPDATE equipo SET ci_capitan = '52000001' WHERE id_equipo = 6;
UPDATE equipo SET ci_capitan = '53000001' WHERE id_equipo = 7;
UPDATE equipo SET ci_capitan = '54000001' WHERE id_equipo = 8;
UPDATE equipo SET ci_capitan = '55000001' WHERE id_equipo = 9;
UPDATE equipo SET ci_capitan = '56000001' WHERE id_equipo = 10;

UPDATE torneo SET estado = 'en_curso' WHERE id_torneo = 2;

-- Fixture de 5 fechas (liga a una rueda, 6 equipos)
INSERT INTO partido (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante,
                     dia, id_turno, nombre_cancha, id_complejo, estado) VALUES
    -- fecha 1 (hace 15 dias)
    (7,  2, 1, 5, 6,  DATE_SUB(@hoy, INTERVAL 15 DAY), 3, 'Cancha 1',       1, 'jugado'),
    (8,  2, 1, 7, 8,  DATE_SUB(@hoy, INTERVAL 15 DAY), 3, 'Cancha 2',       1, 'jugado'),
    (9,  2, 1, 9, 10, DATE_SUB(@hoy, INTERVAL 15 DAY), 2, 'Cancha A',       2, 'jugado'),
    -- fecha 2 (hace 8 dias)
    (10, 2, 2, 5, 7,  DATE_SUB(@hoy, INTERVAL 8 DAY),  3, 'Cancha 1',       1, 'jugado'),
    (11, 2, 2, 6, 9,  DATE_SUB(@hoy, INTERVAL 8 DAY),  4, 'Cancha A',       2, 'jugado'),
    (12, 2, 2, 8, 10, DATE_SUB(@hoy, INTERVAL 8 DAY),  2, 'Cancha Central', 3, 'jugado'),
    -- fecha 3 (ayer: todavia se puede corregir, ventana de 48 h)
    (13, 2, 3, 5, 8,  DATE_SUB(@hoy, INTERVAL 1 DAY),  3, 'Cancha 1',       1, 'jugado'),
    (14, 2, 3, 6, 10, DATE_SUB(@hoy, INTERVAL 1 DAY),  4, 'Cancha 2',       1, 'jugado'),
    (15, 2, 3, 7, 9,  DATE_SUB(@hoy, INTERVAL 1 DAY),  1, 'Cancha B',       2, 'jugado'),
    -- fecha 4 (en 6 dias): un postergado y un cancelado que se volvio a programar
    (16, 2, 4, 5, 9,  DATE_ADD(@hoy, INTERVAL 6 DAY),  3, 'Cancha 1',       1, 'postergado'),
    (17, 2, 4, 6, 8,  DATE_ADD(@hoy, INTERVAL 6 DAY),  3, 'Cancha 2',       1, 'programado'),
    (18, 2, 4, 7, 10, DATE_ADD(@hoy, INTERVAL 6 DAY),  2, 'Cancha Central', 3, 'cancelado'),
    (19, 2, 4, 7, 10, DATE_ADD(@hoy, INTERVAL 6 DAY),  4, 'Cancha A',       2, 'programado'),  -- mismo cruce: valido porque el anterior esta cancelado
    -- fecha 5 (en 13 dias)
    (20, 2, 5, 5, 10, DATE_ADD(@hoy, INTERVAL 13 DAY), 3, 'Cancha 1',       1, 'programado'),
    (21, 2, 5, 6, 7,  DATE_ADD(@hoy, INTERVAL 13 DAY), 3, 'Cancha 2',       1, 'programado'),
    (22, 2, 5, 8, 9,  DATE_ADD(@hoy, INTERVAL 13 DAY), 2, 'Cancha A',       2, 'programado');

-- ---------------------------------------------------------------------
-- Fecha 1. Planilla = plantel de los dos equipos menos los que no jugaron.
--   No juegan nunca: 51000007 (Camila), 53000002 (Micaela), 56000007 (Mauricio)
-- ---------------------------------------------------------------------
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT 7, ci_jugador, id_equipo FROM equipo_jugador_torneo
WHERE id_equipo IN (5, 6) AND ci_jugador NOT IN ('51000007', '52000008');
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT 8, ci_jugador, id_equipo FROM equipo_jugador_torneo
WHERE id_equipo IN (7, 8) AND ci_jugador NOT IN ('53000002', '54000008');
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT 9, ci_jugador, id_equipo FROM equipo_jugador_torneo
WHERE id_equipo IN (9, 10) AND ci_jugador NOT IN ('55000007', '56000007');

INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES
    (7, '51000003', 12, FALSE), (7, '51000003', 33, FALSE), (7, '51000002', 51, FALSE),  -- 3-1
    (7, '52000001', 40, FALSE),
    -- partido 8: 0-0
    (9, '55000001',  8, FALSE), (9, '55000003', 47, FALSE),                              -- 2-2
    (9, '56000001', 22, FALSE), (9, '56000003', 58, FALSE);

INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES
    (7, '52000005', 30, 'amarilla'),
    (8, '53000003', 20, 'amarilla'),    -- Santiago Cabrera: 1.a amarilla
    (8, '54000003', 55, 'amarilla'),
    (9, '56000005', 40, 'amarilla');

-- Sancion disciplinaria (cargada por la organizacion): Emiliano Correa, fechas 2 y 3
INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas) VALUES
    ('54000003', 2, 'disciplinaria', 2, 2);

-- ---------------------------------------------------------------------
-- Fecha 2
-- ---------------------------------------------------------------------
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT 10, ci_jugador, id_equipo FROM equipo_jugador_torneo
WHERE id_equipo IN (5, 7) AND ci_jugador NOT IN ('51000007', '51000005', '53000002');
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT 11, ci_jugador, id_equipo FROM equipo_jugador_torneo
WHERE id_equipo IN (6, 9) AND ci_jugador NOT IN ('55000007');
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT 12, ci_jugador, id_equipo FROM equipo_jugador_torneo
WHERE id_equipo IN (8, 10) AND ci_jugador NOT IN ('54000003', '56000007');   -- 54000003 suspendido

INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES
    (10, '51000001', 18, FALSE), (10, '51000003', 44, FALSE),                                -- 2-0
    (11, '52000003',  5, FALSE),                                                             -- 1-3
    (11, '55000001', 27, FALSE), (11, '55000001', 39, FALSE), (11, '55000004', 55, FALSE),
    (12, '54000001', 14, FALSE), (12, '54000005', 50, FALSE),                                -- 2-1
    (12, '56000002', 31, FALSE);

INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES
    (10, '53000003', 35, 'amarilla'),   -- Santiago Cabrera: 2.a amarilla
    (11, '52000002', 10, 'amarilla'),
    (11, '52000005', 50, 'roja'),       -- Matias Diaz: el trigger lo suspende para la fecha 3
    (12, '54000007', 25, 'amarilla');

-- ---------------------------------------------------------------------
-- Fecha 3 (ayer)
-- ---------------------------------------------------------------------
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT 13, ci_jugador, id_equipo FROM equipo_jugador_torneo
WHERE id_equipo IN (5, 8) AND ci_jugador NOT IN ('51000007', '54000003');                -- 54000003 suspendido
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT 14, ci_jugador, id_equipo FROM equipo_jugador_torneo
WHERE id_equipo IN (6, 10) AND ci_jugador NOT IN ('52000005', '56000007');                -- 52000005 suspendido (roja)
INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo)
SELECT 15, ci_jugador, id_equipo FROM equipo_jugador_torneo
WHERE id_equipo IN (7, 9) AND ci_jugador NOT IN ('53000002');

INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES
    (13, '51000002',  9, FALSE), (13, '54000002', 36, FALSE),                                -- 1-1
    (14, '56000001', 25, FALSE), (14, '52000004', 52, TRUE),                                 -- 0-2 (autogol de Nicolas Acosta)
    (15, '53000001', 30, FALSE),                                                             -- 1-2
    (15, '55000001', 11, FALSE), (15, '55000002', 59, FALSE);

INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES
    (15, '53000003', 15, 'amarilla'),   -- Santiago Cabrera: 3.a amarilla -> el trigger lo suspende para la fecha 4
    (15, '55000002', 45, 'amarilla');
