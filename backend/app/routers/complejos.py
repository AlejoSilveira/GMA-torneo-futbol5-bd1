from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .. import util
from ..errores import conflicto
from ..seguridad import solo_admin

router = APIRouter(prefix="/complejos", tags=["complejos"])


class ComplejoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    direccion: str = Field(min_length=1, max_length=150)
    departamento: str = Field(min_length=1, max_length=50)


class CanchaDatos(BaseModel):
    superficie: Literal["sintetico", "parquet"]
    techada: bool


class CanchaIn(CanchaDatos):
    nombre_cancha: str = Field(min_length=1, max_length=50)


def _complejo(db, id_complejo: int) -> dict:
    return util.obtener(db, "SELECT * FROM complejo WHERE id_complejo=%s", (id_complejo,), "el complejo")


def _cancha(db, id_complejo: int, nombre: str) -> dict:
    fila = util.obtener(db, "SELECT * FROM cancha WHERE id_complejo=%s AND nombre_cancha=%s",
                        (id_complejo, nombre), "la cancha")
    fila["techada"] = bool(fila["techada"])
    return fila


@router.get("")
def listar(db=Depends(solo_admin)):
    return db.todos("SELECT * FROM complejo ORDER BY nombre")


@router.post("", status_code=201)
def crear(c: ComplejoIn, db=Depends(solo_admin)):
    _, nuevo_id = db.ejecutar("INSERT INTO complejo (nombre, direccion, departamento) VALUES (%s, %s, %s)",
                              (c.nombre.strip(), c.direccion.strip(), c.departamento.strip()))
    return _complejo(db, nuevo_id)


@router.put("/{id_complejo}")
def modificar(id_complejo: int, c: ComplejoIn, db=Depends(solo_admin)):
    _complejo(db, id_complejo)
    db.ejecutar("UPDATE complejo SET nombre=%s, direccion=%s, departamento=%s WHERE id_complejo=%s",
                (c.nombre.strip(), c.direccion.strip(), c.departamento.strip(), id_complejo))
    return _complejo(db, id_complejo)


@router.delete("/{id_complejo}", status_code=204)
def borrar(id_complejo: int, db=Depends(solo_admin)):
    _complejo(db, id_complejo)
    if db.uno("SELECT 1 FROM partido WHERE id_complejo=%s LIMIT 1", (id_complejo,)):
        raise conflicto("No se puede borrar un complejo que tiene partidos asignados")
    db.ejecutar("DELETE FROM cancha WHERE id_complejo=%s", (id_complejo,))
    db.ejecutar("DELETE FROM complejo WHERE id_complejo=%s", (id_complejo,))


@router.get("/{id_complejo}/canchas")
def listar_canchas(id_complejo: int, db=Depends(solo_admin)):
    _complejo(db, id_complejo)
    filas = db.todos("SELECT * FROM cancha WHERE id_complejo=%s ORDER BY nombre_cancha", (id_complejo,))
    for f in filas:
        f["techada"] = bool(f["techada"])
    return filas


@router.post("/{id_complejo}/canchas", status_code=201)
def crear_cancha(id_complejo: int, c: CanchaIn, db=Depends(solo_admin)):
    _complejo(db, id_complejo)
    nombre = c.nombre_cancha.strip()
    if db.uno("SELECT 1 FROM cancha WHERE id_complejo=%s AND nombre_cancha=%s", (id_complejo, nombre)):
        raise conflicto("Ya existe una cancha con ese nombre en el complejo")
    db.ejecutar("INSERT INTO cancha (nombre_cancha, id_complejo, superficie, techada) VALUES (%s, %s, %s, %s)",
                (nombre, id_complejo, c.superficie, c.techada))
    return _cancha(db, id_complejo, nombre)


@router.put("/{id_complejo}/canchas/{nombre}")
def modificar_cancha(id_complejo: int, nombre: str, c: CanchaDatos, db=Depends(solo_admin)):
    # El nombre es parte de la clave primaria: se modifican superficie y techada
    _cancha(db, id_complejo, nombre)
    db.ejecutar("UPDATE cancha SET superficie=%s, techada=%s WHERE id_complejo=%s AND nombre_cancha=%s",
                (c.superficie, c.techada, id_complejo, nombre))
    return _cancha(db, id_complejo, nombre)


@router.delete("/{id_complejo}/canchas/{nombre}", status_code=204)
def borrar_cancha(id_complejo: int, nombre: str, db=Depends(solo_admin)):
    _cancha(db, id_complejo, nombre)
    if db.uno("SELECT 1 FROM partido WHERE id_complejo=%s AND nombre_cancha=%s LIMIT 1", (id_complejo, nombre)):
        raise conflicto("No se puede borrar una cancha que tiene partidos asignados")
    db.ejecutar("DELETE FROM cancha WHERE id_complejo=%s AND nombre_cancha=%s", (id_complejo, nombre))
