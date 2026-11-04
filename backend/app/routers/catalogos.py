"""Facultades y turnos: solo lectura, vienen cargados desde el script de la base."""
from fastapi import APIRouter, Depends

from .. import util
from ..seguridad import admin_o_planillero

router = APIRouter(tags=["catalogos"])


@router.get("/facultades")
def listar_facultades(db=Depends(admin_o_planillero)):
    return db.todos("SELECT id_facultad, nombre FROM facultad ORDER BY nombre")


@router.get("/turnos")
def listar_turnos(db=Depends(admin_o_planillero)):
    filas = db.todos("SELECT id_turno, hora_inicio, hora_fin FROM turno ORDER BY hora_inicio")
    # MySQL devuelve TIME como timedelta; el api.md pide "HH:MM"
    for f in filas:
        f["hora_inicio"], f["hora_fin"] = util.hhmm(f["hora_inicio"]), util.hhmm(f["hora_fin"])
    return filas
