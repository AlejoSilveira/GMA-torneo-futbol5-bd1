from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .. import util
from ..seguridad import solo_admin

router = APIRouter(prefix="/sanciones", tags=["sanciones"])


class SancionIn(BaseModel):
    ci_jugador: str = Field(pattern=util.PATRON_CI)
    id_torneo: int = Field(gt=0)
    motivo: Literal["roja", "acumulacion_amarillas", "disciplinaria"]
    numero_fecha_inicio: int = Field(ge=1, le=50)
    cantidad_fechas: int = Field(ge=1, le=50)


def _sancion(db, id_sancion: int) -> dict:
    return util.obtener(db, "SELECT * FROM sancion_jugador WHERE id_sancion=%s", (id_sancion,), "la sanción")


def _validar(db, s: SancionIn) -> None:
    util.torneo(db, s.id_torneo)
    util.obtener(db, "SELECT 1 FROM jugador WHERE ci=%s", (s.ci_jugador,), "el jugador")


@router.get("")
def listar(torneo: int | None = None, ci: str | None = None, db=Depends(solo_admin)):
    return db.todos(
        "SELECT s.*, j.nombre, j.apellido FROM sancion_jugador s JOIN jugador j ON j.ci = s.ci_jugador "
        "WHERE (%s IS NULL OR s.id_torneo=%s) AND (%s IS NULL OR s.ci_jugador=%s) "
        "ORDER BY s.id_torneo, s.numero_fecha_inicio", (torneo, torneo, ci, ci))


@router.post("", status_code=201)
def crear(s: SancionIn, db=Depends(solo_admin)):
    _validar(db, s)
    _, nuevo_id = db.ejecutar(
        "INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas) "
        "VALUES (%s, %s, %s, %s, %s)",
        (s.ci_jugador, s.id_torneo, s.motivo, s.numero_fecha_inicio, s.cantidad_fechas))
    return _sancion(db, nuevo_id)


@router.put("/{id_sancion}")
def modificar(id_sancion: int, s: SancionIn, db=Depends(solo_admin)):
    _sancion(db, id_sancion)
    _validar(db, s)
    db.ejecutar("UPDATE sancion_jugador SET ci_jugador=%s, id_torneo=%s, motivo=%s, numero_fecha_inicio=%s, "
                "cantidad_fechas=%s WHERE id_sancion=%s",
                (s.ci_jugador, s.id_torneo, s.motivo, s.numero_fecha_inicio, s.cantidad_fechas, id_sancion))
    return _sancion(db, id_sancion)


@router.delete("/{id_sancion}", status_code=204)
def borrar(id_sancion: int, db=Depends(solo_admin)):
    _sancion(db, id_sancion)
    db.ejecutar("DELETE FROM sancion_jugador WHERE id_sancion=%s", (id_sancion,))
