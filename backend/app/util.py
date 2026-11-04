"""Funciones comunes a varios routers."""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .db import Db
from .errores import conflicto, no_encontrado

ZONA = ZoneInfo("America/Montevideo")
HORAS_CORRECCION = 48

# Patrones de validación compartidos (la base también los controla con CHECK)
PATRON_CI = r"^\d{6,8}$"
PATRON_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def ahora() -> datetime:
    """Hora actual de Uruguay, sin zona (igual que las fechas guardadas en la base)."""
    return datetime.now(ZONA).replace(tzinfo=None)


def a_time(valor) -> time:
    """MySQL devuelve las columnas TIME como timedelta."""
    if isinstance(valor, timedelta):
        return (datetime.min + valor).time()
    return valor


def hhmm(valor) -> str:
    return a_time(valor).strftime("%H:%M")


def obtener(db: Db, sql: str, params: tuple, que: str) -> dict:
    """SELECT de una fila o 404 con un mensaje claro."""
    fila = db.uno(sql, params)
    if fila is None:
        raise no_encontrado(f"No existe {que}")
    return fila


def torneo(db: Db, id_torneo: int) -> dict:
    return obtener(db, "SELECT * FROM torneo WHERE id_torneo = %s", (id_torneo,), "el torneo")


def exigir_inscripcion(db: Db, id_torneo: int) -> None:
    if torneo(db, id_torneo)["estado"] != "inscripcion":
        raise conflicto("Los planteles solo se pueden modificar con el torneo en etapa de inscripción")


def inicio_y_fin_partido(p: dict) -> tuple[datetime, datetime]:
    """p debe traer dia, hora_inicio y hora_fin (join con turno)."""
    dia: date = p["dia"]
    return (datetime.combine(dia, a_time(p["hora_inicio"])),
            datetime.combine(dia, a_time(p["hora_fin"])))


def partido_con_turno(db: Db, id_partido: int, bloquear: bool = False) -> dict:
    sql = ("SELECT p.*, t.hora_inicio, t.hora_fin FROM partido p "
           "JOIN turno t ON t.id_turno = p.id_turno WHERE p.id_partido = %s")
    if bloquear:
        sql += " FOR UPDATE"  # evita que dos planilleros corrijan el mismo partido a la vez
    return obtener(db, sql, (id_partido,), "el partido")


def exigir_ventana_planilla(p: dict) -> None:
    """La planilla, goles y tarjetas se cargan una vez terminado el turno del partido
    y se pueden corregir hasta 48 horas después (letra: correcciones dentro de 48 h)."""
    if p["estado"] in ("cancelado", "postergado"):
        raise conflicto(f"El partido está {p['estado']}, no se le puede cargar planilla")
    _, fin = inicio_y_fin_partido(p)
    if ahora() < fin:
        raise conflicto("El partido todavía no terminó, la planilla se carga después del turno")
    if ahora() > fin + timedelta(hours=HORAS_CORRECCION):
        raise conflicto("Pasaron más de 48 horas desde el partido, ya no se puede corregir")


def sql_goles(lado: str) -> str:
    """Subconsulta de goles de un equipo en un partido `p`, calculada desde la tabla gol.
    Un gol cuenta para el equipo del jugador, salvo que sea autogol (cuenta para el rival)."""
    propio = "p.id_equipo_local" if lado == "local" else "p.id_equipo_visitante"
    rival = "p.id_equipo_visitante" if lado == "local" else "p.id_equipo_local"
    return (f"(SELECT COUNT(*) FROM gol g JOIN planilla_partido pp "
            f"ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador "
            f"WHERE g.id_partido = p.id_partido AND "
            f"((pp.id_equipo = {propio} AND g.autogol = FALSE) OR "
            f"(pp.id_equipo = {rival} AND g.autogol = TRUE)))")
