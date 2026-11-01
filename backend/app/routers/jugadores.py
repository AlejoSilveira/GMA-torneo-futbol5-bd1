from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator

from .. import util
from ..errores import conflicto, invalido
from ..seguridad import solo_admin

router = APIRouter(prefix="/jugadores", tags=["jugadores"])

Tipo = Literal["grado", "posgrado", "docente", "funcionario"]


class JugadorDatos(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    apellido: str = Field(min_length=1, max_length=50)
    email: str = Field(max_length=100, pattern=util.PATRON_EMAIL)
    fecha_nacimiento: date
    id_facultad: int = Field(gt=0)
    tipo: Tipo

    @field_validator("fecha_nacimiento")
    @classmethod
    def _no_futura(cls, v: date):
        if v >= date.today():
            raise ValueError("la fecha de nacimiento tiene que ser anterior a hoy")
        return v


class JugadorIn(JugadorDatos):
    ci: str = Field(pattern=util.PATRON_CI)


def _jugador(db, ci: str) -> dict:
    return util.obtener(db, "SELECT * FROM jugador WHERE ci = %s", (ci,), "el jugador")


def _validar_facultad(db, id_facultad: int) -> None:
    if not db.uno("SELECT 1 FROM facultad WHERE id_facultad = %s", (id_facultad,)):
        raise invalido("La facultad no existe")


@router.get("")
def listar(facultad: int | None = None, tipo: Tipo | None = None, db=Depends(solo_admin)):
    # Filtros opcionales, siempre como parámetros
    sql = "SELECT * FROM jugador WHERE (%s IS NULL OR id_facultad = %s) AND (%s IS NULL OR tipo = %s)"
    return db.todos(sql + " ORDER BY apellido, nombre", (facultad, facultad, tipo, tipo))


@router.get("/{ci}")
def detalle(ci: str, db=Depends(solo_admin)):
    return _jugador(db, ci)


@router.post("", status_code=201)
def crear(j: JugadorIn, db=Depends(solo_admin)):
    _validar_facultad(db, j.id_facultad)
    if db.uno("SELECT 1 FROM jugador WHERE ci = %s", (j.ci,)):
        raise conflicto("Ya existe un jugador con esa cédula")
    db.ejecutar("INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (j.ci, j.nombre.strip(), j.apellido.strip(), j.email.strip().lower(),
                 j.fecha_nacimiento, j.id_facultad, j.tipo))
    return _jugador(db, j.ci)


@router.put("/{ci}")
def modificar(ci: str, j: JugadorDatos, db=Depends(solo_admin)):
    actual = _jugador(db, ci)
    _validar_facultad(db, j.id_facultad)
    # Si ya está en un plantel, cambiarle facultad o tipo podría romper las reglas del equipo
    if (j.id_facultad != actual["id_facultad"] or j.tipo != actual["tipo"]) and db.uno(
            "SELECT 1 FROM equipo_jugador_torneo WHERE ci_jugador = %s LIMIT 1", (ci,)):
        raise conflicto("No se puede cambiar la facultad o el tipo de un jugador que ya integra un plantel")
    db.ejecutar("UPDATE jugador SET nombre=%s, apellido=%s, email=%s, fecha_nacimiento=%s, "
                "id_facultad=%s, tipo=%s WHERE ci=%s",
                (j.nombre.strip(), j.apellido.strip(), j.email.strip().lower(),
                 j.fecha_nacimiento, j.id_facultad, j.tipo, ci))
    return _jugador(db, ci)


@router.delete("/{ci}", status_code=204)
def borrar(ci: str, db=Depends(solo_admin)):
    _jugador(db, ci)
    if db.uno("SELECT 1 FROM equipo_jugador_torneo WHERE ci_jugador = %s LIMIT 1", (ci,)):
        raise conflicto("No se puede borrar un jugador que integra un plantel; quitalo del plantel primero")
    db.ejecutar("DELETE FROM jugador WHERE ci = %s", (ci,))
