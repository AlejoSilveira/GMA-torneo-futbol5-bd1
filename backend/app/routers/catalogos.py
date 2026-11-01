"""Facultades y turnos: solo lectura, vienen cargados desde el script de la base."""
from fastapi import APIRouter, Depends

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
        for campo in ("hora_inicio", "hora_fin"):
            seg = int(f[campo].total_seconds())
            f[campo] = f"{seg // 3600:02d}:{seg % 3600 // 60:02d}"
    return filas
