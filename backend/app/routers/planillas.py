"""Planilla de juego, goles y tarjetas (los puede cargar el planillero)."""
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .. import util
from ..errores import conflicto
from ..seguridad import admin_o_planillero

router = APIRouter(tags=["planillas"])


class PlanillaIn(BaseModel):
    ci_jugador: str = Field(pattern=util.PATRON_CI)
    id_equipo: int = Field(gt=0)


class GolIn(BaseModel):
    ci_jugador: str = Field(pattern=util.PATRON_CI)
    minuto: int = Field(ge=0, le=60)
    autogol: bool = False


class TarjetaIn(BaseModel):
    ci_jugador: str = Field(pattern=util.PATRON_CI)
    minuto: int = Field(ge=0, le=60)
    color: Literal["amarilla", "roja"]


def _partido_editable(db, id_partido: int) -> dict:
    p = util.partido_con_turno(db, id_partido)
    util.exigir_ventana_planilla(p)
    return p


def _exigir_en_planilla(db, id_partido: int, ci: str) -> None:
    if not db.uno("SELECT 1 FROM planilla_partido WHERE id_partido=%s AND ci_jugador=%s", (id_partido, ci)):
        raise conflicto("El jugador no figura en la planilla de este partido")


def _suspendido(db, ci: str, id_torneo: int, numero_fecha: int) -> bool:
    return db.uno(
        "SELECT 1 FROM sancion_jugador WHERE ci_jugador=%s AND id_torneo=%s "
        "AND %s BETWEEN numero_fecha_inicio AND numero_fecha_inicio + cantidad_fechas - 1",
        (ci, id_torneo, numero_fecha)) is not None


# ---------- Planilla ----------

@router.get("/partidos/{id_partido}/planilla")
def ver_planilla(id_partido: int, db=Depends(admin_o_planillero)):
    util.partido_con_turno(db, id_partido)
    return db.todos(
        "SELECT pp.ci_jugador, pp.id_equipo, j.nombre, j.apellido, ejt.numero_camiseta "
        "FROM planilla_partido pp JOIN jugador j ON j.ci = pp.ci_jugador "
        "LEFT JOIN equipo_jugador_torneo ejt ON ejt.id_equipo = pp.id_equipo AND ejt.ci_jugador = pp.ci_jugador "
        "WHERE pp.id_partido=%s ORDER BY pp.id_equipo, ejt.numero_camiseta", (id_partido,))


@router.post("/partidos/{id_partido}/planilla", status_code=201)
def agregar_a_planilla(id_partido: int, body: PlanillaIn, db=Depends(admin_o_planillero)):
    p = _partido_editable(db, id_partido)
    if body.id_equipo not in (p["id_equipo_local"], p["id_equipo_visitante"]):
        raise conflicto("El equipo no juega este partido")
    if not db.uno("SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo=%s AND ci_jugador=%s",
                  (body.id_equipo, body.ci_jugador)):
        raise conflicto("El jugador no está en el plantel de ese equipo")
    if _suspendido(db, body.ci_jugador, p["id_torneo"], p["numero_fecha"]):
        raise conflicto("El jugador está suspendido para esta fecha")
    if db.uno("SELECT 1 FROM planilla_partido WHERE id_partido=%s AND ci_jugador=%s",
              (id_partido, body.ci_jugador)):
        raise conflicto("El jugador ya está en la planilla")
    db.ejecutar("INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo) VALUES (%s, %s, %s)",
                (id_partido, body.ci_jugador, body.id_equipo))
    return ver_planilla(id_partido, db)


@router.delete("/partidos/{id_partido}/planilla/{ci}", status_code=204)
def quitar_de_planilla(id_partido: int, ci: str, db=Depends(admin_o_planillero)):
    _partido_editable(db, id_partido)
    _exigir_en_planilla(db, id_partido, ci)
    if db.uno("SELECT 1 FROM gol WHERE id_partido=%s AND ci_jugador=%s UNION ALL "
              "SELECT 1 FROM tarjeta WHERE id_partido=%s AND ci_jugador=%s LIMIT 1",
              (id_partido, ci, id_partido, ci)):
        raise conflicto("El jugador tiene goles o tarjetas en este partido; borralos primero")
    db.ejecutar("DELETE FROM planilla_partido WHERE id_partido=%s AND ci_jugador=%s", (id_partido, ci))


# ---------- Goles ----------

def _gol(db, id_gol: int) -> dict:
    g = util.obtener(db, "SELECT * FROM gol WHERE id_gol=%s", (id_gol,), "el gol")
    g["autogol"] = bool(g["autogol"])
    return g


@router.get("/partidos/{id_partido}/goles")
def listar_goles(id_partido: int, db=Depends(admin_o_planillero)):
    util.partido_con_turno(db, id_partido)
    filas = db.todos("SELECT g.*, j.nombre, j.apellido, pp.id_equipo FROM gol g "
                     "JOIN jugador j ON j.ci = g.ci_jugador "
                     "JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador "
                     "WHERE g.id_partido=%s ORDER BY g.minuto", (id_partido,))
    for g in filas:
        g["autogol"] = bool(g["autogol"])
    return filas


@router.post("/partidos/{id_partido}/goles", status_code=201)
def agregar_gol(id_partido: int, body: GolIn, db=Depends(admin_o_planillero)):
    _partido_editable(db, id_partido)
    _exigir_en_planilla(db, id_partido, body.ci_jugador)
    _, nuevo_id = db.ejecutar("INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES (%s, %s, %s, %s)",
                              (id_partido, body.ci_jugador, body.minuto, body.autogol))
    return _gol(db, nuevo_id)


@router.put("/goles/{id_gol}")
def corregir_gol(id_gol: int, body: GolIn, db=Depends(admin_o_planillero)):
    g = _gol(db, id_gol)
    _partido_editable(db, g["id_partido"])
    _exigir_en_planilla(db, g["id_partido"], body.ci_jugador)
    db.ejecutar("UPDATE gol SET ci_jugador=%s, minuto=%s, autogol=%s WHERE id_gol=%s",
                (body.ci_jugador, body.minuto, body.autogol, id_gol))
    return _gol(db, id_gol)


@router.delete("/goles/{id_gol}", status_code=204)
def borrar_gol(id_gol: int, db=Depends(admin_o_planillero)):
    g = _gol(db, id_gol)
    _partido_editable(db, g["id_partido"])
    db.ejecutar("DELETE FROM gol WHERE id_gol=%s", (id_gol,))


# ---------- Tarjetas ----------
# Las sanciones automáticas (roja / 3 amarillas) las crean los triggers de la base.

def _tarjeta(db, id_tarjeta: int) -> dict:
    return util.obtener(db, "SELECT * FROM tarjeta WHERE id_tarjeta=%s", (id_tarjeta,), "la tarjeta")


@router.get("/partidos/{id_partido}/tarjetas")
def listar_tarjetas(id_partido: int, db=Depends(admin_o_planillero)):
    util.partido_con_turno(db, id_partido)
    return db.todos("SELECT t.*, j.nombre, j.apellido, pp.id_equipo FROM tarjeta t "
                    "JOIN jugador j ON j.ci = t.ci_jugador "
                    "JOIN planilla_partido pp ON pp.id_partido = t.id_partido AND pp.ci_jugador = t.ci_jugador "
                    "WHERE t.id_partido=%s ORDER BY t.minuto", (id_partido,))


@router.post("/partidos/{id_partido}/tarjetas", status_code=201)
def agregar_tarjeta(id_partido: int, body: TarjetaIn, db=Depends(admin_o_planillero)):
    _partido_editable(db, id_partido)
    _exigir_en_planilla(db, id_partido, body.ci_jugador)
    _, nuevo_id = db.ejecutar("INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (%s, %s, %s, %s)",
                              (id_partido, body.ci_jugador, body.minuto, body.color))
    return _tarjeta(db, nuevo_id)


@router.put("/tarjetas/{id_tarjeta}")
def corregir_tarjeta(id_tarjeta: int, body: TarjetaIn, db=Depends(admin_o_planillero)):
    t = _tarjeta(db, id_tarjeta)
    _partido_editable(db, t["id_partido"])
    _exigir_en_planilla(db, t["id_partido"], body.ci_jugador)
    db.ejecutar("UPDATE tarjeta SET ci_jugador=%s, minuto=%s, color=%s WHERE id_tarjeta=%s",
                (body.ci_jugador, body.minuto, body.color, id_tarjeta))
    return _tarjeta(db, id_tarjeta)


@router.delete("/tarjetas/{id_tarjeta}", status_code=204)
def borrar_tarjeta(id_tarjeta: int, db=Depends(admin_o_planillero)):
    t = _tarjeta(db, id_tarjeta)
    _partido_editable(db, t["id_partido"])
    db.ejecutar("DELETE FROM tarjeta WHERE id_tarjeta=%s", (id_tarjeta,))
