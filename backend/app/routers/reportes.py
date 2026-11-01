"""Reportes para el área de deportes. Todos solo lectura y solo para administradores.

Cada reporte es una consulta SQL escrita a mano; los resultados de partidos se calculan
siempre desde la tabla gol (los autogoles cuentan para el rival).
"""
from fastapi import APIRouter, Depends

from .. import util
from ..seguridad import solo_admin

router = APIRouter(prefix="/reportes", tags=["reportes"])

# Resultado de cada partido jugado del torneo, visto desde cada equipo (una fila por equipo y partido)
_CTE_RESULTADOS = f"""
WITH res AS (
    SELECT p.id_equipo_local AS loc, p.id_equipo_visitante AS vis,
           {util.sql_goles('local')} AS gl, {util.sql_goles('visitante')} AS gv
    FROM partido p
    WHERE p.id_torneo = %s AND p.estado = 'jugado'
),
filas AS (
    SELECT loc AS id_equipo, gl AS gf, gv AS gc FROM res
    UNION ALL
    SELECT vis AS id_equipo, gv AS gf, gl AS gc FROM res
)
"""


@router.get("/posiciones")
def posiciones(torneo: int, db=Depends(solo_admin)):
    util.torneo(db, torneo)
    return db.todos(_CTE_RESULTADOS + """
        SELECT e.id_equipo, e.nombre AS equipo,
               CAST(COUNT(f.id_equipo) AS SIGNED)                       AS pj,
               CAST(COALESCE(SUM(f.gf > f.gc), 0) AS SIGNED)            AS pg,
               CAST(COALESCE(SUM(f.gf = f.gc), 0) AS SIGNED)            AS pe,
               CAST(COALESCE(SUM(f.gf < f.gc), 0) AS SIGNED)            AS pp,
               CAST(COALESCE(SUM(f.gf), 0) AS SIGNED)                   AS gf,
               CAST(COALESCE(SUM(f.gc), 0) AS SIGNED)                   AS gc,
               CAST(COALESCE(SUM(f.gf) - SUM(f.gc), 0) AS SIGNED)       AS dg,
               CAST(COALESCE(SUM(f.gf > f.gc) * 3 + SUM(f.gf = f.gc), 0) AS SIGNED) AS puntos
        FROM equipo e
        LEFT JOIN filas f ON f.id_equipo = e.id_equipo
        WHERE e.id_torneo = %s
        GROUP BY e.id_equipo, e.nombre
        ORDER BY puntos DESC, dg DESC, gf DESC, e.nombre
    """, (torneo, torneo))


@router.get("/goleadores")
def goleadores(torneo: int, db=Depends(solo_admin)):
    util.torneo(db, torneo)
    return db.todos("""
        SELECT j.ci, j.nombre, j.apellido, e.nombre AS equipo, COUNT(*) AS goles
        FROM gol g
        JOIN partido p           ON p.id_partido = g.id_partido
        JOIN jugador j           ON j.ci = g.ci_jugador
        JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
        JOIN equipo e            ON e.id_equipo = pp.id_equipo
        WHERE p.id_torneo = %s AND p.estado = 'jugado' AND g.autogol = FALSE
        GROUP BY j.ci, j.nombre, j.apellido, e.nombre
        ORDER BY goles DESC, j.apellido, j.nombre
        LIMIT 10
    """, (torneo,))


@router.get("/fair-play")
def fair_play(torneo: int, db=Depends(solo_admin)):
    util.torneo(db, torneo)
    return db.todos("""
        SELECT e.id_equipo, e.nombre AS equipo,
               CAST(COALESCE(SUM(t.color = 'amarilla'), 0) AS SIGNED) AS amarillas,
               CAST(COALESCE(SUM(t.color = 'roja'), 0) AS SIGNED)     AS rojas,
               CAST(COALESCE(SUM(t.color = 'amarilla') + 3 * SUM(t.color = 'roja'), 0) AS SIGNED) AS puntaje
        FROM equipo e
        LEFT JOIN planilla_partido pp ON pp.id_equipo = e.id_equipo
        LEFT JOIN tarjeta t           ON t.id_partido = pp.id_partido AND t.ci_jugador = pp.ci_jugador
        WHERE e.id_torneo = %s
        GROUP BY e.id_equipo, e.nombre
        ORDER BY puntaje ASC, e.nombre
    """, (torneo,))


@router.get("/promedio-goles")
def promedio_goles(torneo: int, db=Depends(solo_admin)):
    """Una fila por fecha y una fila final con el total de la edición."""
    util.torneo(db, torneo)
    return db.todos("""
        WITH x AS (
            SELECT p.numero_fecha, p.id_partido,
                   (SELECT COUNT(*) FROM gol g WHERE g.id_partido = p.id_partido) AS goles
            FROM partido p
            WHERE p.id_torneo = %s AND p.estado = 'jugado'
        )
        SELECT CAST(numero_fecha AS CHAR) AS fecha, COUNT(*) AS partidos,
               CAST(SUM(goles) AS SIGNED) AS goles, ROUND(AVG(goles), 2) AS promedio
        FROM x GROUP BY numero_fecha
        UNION ALL
        SELECT 'Total', COUNT(*), CAST(COALESCE(SUM(goles), 0) AS SIGNED), ROUND(COALESCE(AVG(goles), 0), 2)
        FROM x
    """, (torneo,))


@router.get("/canchas-turnos")
def canchas_turnos(torneo: int, db=Depends(solo_admin)):
    """Uso de cada cancha en cada turno (sin contar partidos cancelados), de más a menos usada."""
    util.torneo(db, torneo)
    filas = db.todos("""
        SELECT c.nombre AS complejo, p.nombre_cancha AS cancha, t.hora_inicio, t.hora_fin,
               COUNT(*) AS partidos
        FROM partido p
        JOIN complejo c ON c.id_complejo = p.id_complejo
        JOIN turno t    ON t.id_turno = p.id_turno
        WHERE p.id_torneo = %s AND p.estado <> 'cancelado'
        GROUP BY c.nombre, p.nombre_cancha, t.id_turno, t.hora_inicio, t.hora_fin
        ORDER BY partidos DESC, complejo, cancha, t.hora_inicio
    """, (torneo,))
    for f in filas:
        f["turno"] = f"{util.hhmm(f.pop('hora_inicio'))}-{util.hhmm(f.pop('hora_fin'))}"
    return filas


@router.get("/jugadores-facultad-tipo")
def jugadores_facultad_tipo(db=Depends(solo_admin)):
    return db.todos("""
        SELECT f.nombre AS facultad, j.tipo, COUNT(*) AS cantidad
        FROM jugador j
        JOIN facultad f ON f.id_facultad = j.id_facultad
        GROUP BY f.nombre, j.tipo
        ORDER BY f.nombre, j.tipo
    """)


@router.get("/nunca-jugaron")
def nunca_jugaron(torneo: int, db=Depends(solo_admin)):
    util.torneo(db, torneo)
    return db.todos("""
        SELECT j.ci, j.nombre, j.apellido, e.nombre AS equipo
        FROM equipo_jugador_torneo ejt
        JOIN jugador j ON j.ci = ejt.ci_jugador
        JOIN equipo e  ON e.id_equipo = ejt.id_equipo
        WHERE ejt.id_torneo = %s
          AND NOT EXISTS (
              SELECT 1 FROM planilla_partido pp
              JOIN partido p ON p.id_partido = pp.id_partido
              WHERE pp.ci_jugador = ejt.ci_jugador AND p.id_torneo = ejt.id_torneo
          )
        ORDER BY e.nombre, j.apellido, j.nombre
    """, (torneo,))


@router.get("/sanciones")
def sanciones(torneo: int, db=Depends(solo_admin)):
    util.torneo(db, torneo)
    return db.todos("""
        SELECT e.nombre AS equipo, s.motivo, COUNT(*) AS cantidad
        FROM sancion_jugador s
        JOIN equipo_jugador_torneo ejt ON ejt.ci_jugador = s.ci_jugador AND ejt.id_torneo = s.id_torneo
        JOIN equipo e                  ON e.id_equipo = ejt.id_equipo
        WHERE s.id_torneo = %s
        GROUP BY e.nombre, s.motivo
        ORDER BY e.nombre, s.motivo
    """, (torneo,))


@router.get("/estado-partidos")
def estado_partidos(torneo: int, db=Depends(solo_admin)):
    """Cantidad y porcentaje de partidos en cada estado (incluye los estados sin partidos)."""
    util.torneo(db, torneo)
    return db.todos("""
        WITH estados AS (
            SELECT 'jugado' AS estado UNION ALL SELECT 'postergado'
            UNION ALL SELECT 'cancelado' UNION ALL SELECT 'programado'
        ),
        total AS (SELECT COUNT(*) AS n FROM partido WHERE id_torneo = %s)
        SELECT es.estado, COUNT(p.id_partido) AS cantidad,
               ROUND(100 * COUNT(p.id_partido) / NULLIF((SELECT n FROM total), 0), 2) AS porcentaje
        FROM estados es
        LEFT JOIN partido p ON p.estado = es.estado AND p.id_torneo = %s
        GROUP BY es.estado
        ORDER BY FIELD(es.estado, 'jugado', 'postergado', 'cancelado', 'programado')
    """, (torneo, torneo))

# Las 3 consultas extra (/reportes/extra-1..3) las define Germán; se agregan cuando pase rutas y columnas.
