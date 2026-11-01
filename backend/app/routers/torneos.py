from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator

from .. import util
from ..errores import conflicto
from ..seguridad import admin_o_planillero, solo_admin

router = APIRouter(prefix="/torneos", tags=["torneos"])

ESTADOS = ("inscripcion", "en_curso", "finalizado")


class TorneoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    anio: int = Field(ge=2000, le=2100)
    semestre: int = Field(ge=1, le=2)
    fecha_inicio: date
    fecha_fin: date

    @model_validator(mode="after")
    def _fechas(self):
        if self.fecha_fin < self.fecha_inicio:
            raise ValueError("fecha_fin no puede ser anterior a fecha_inicio")
        return self


class EstadoIn(BaseModel):
    estado: Literal["inscripcion", "en_curso", "finalizado"]


@router.get("")
def listar(db=Depends(admin_o_planillero)):
    return db.todos("SELECT * FROM torneo ORDER BY anio DESC, semestre DESC")


@router.get("/{id_torneo}")
def detalle(id_torneo: int, db=Depends(admin_o_planillero)):
    return util.torneo(db, id_torneo)


@router.post("", status_code=201)
def crear(t: TorneoIn, db=Depends(solo_admin)):
    _, nuevo_id = db.ejecutar(
        "INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin, estado) "
        "VALUES (%s, %s, %s, %s, %s, 'inscripcion')",
        (t.nombre.strip(), t.anio, t.semestre, t.fecha_inicio, t.fecha_fin))
    return util.torneo(db, nuevo_id)


@router.put("/{id_torneo}")
def modificar(id_torneo: int, t: TorneoIn, db=Depends(solo_admin)):
    util.torneo(db, id_torneo)
    db.ejecutar("UPDATE torneo SET nombre=%s, anio=%s, semestre=%s, fecha_inicio=%s, fecha_fin=%s "
                "WHERE id_torneo=%s",
                (t.nombre.strip(), t.anio, t.semestre, t.fecha_inicio, t.fecha_fin, id_torneo))
    return util.torneo(db, id_torneo)


@router.delete("/{id_torneo}", status_code=204)
def borrar(id_torneo: int, db=Depends(solo_admin)):
    util.torneo(db, id_torneo)
    if db.uno("SELECT 1 FROM partido WHERE id_torneo=%s LIMIT 1", (id_torneo,)):
        raise conflicto("No se puede borrar un torneo que ya tiene partidos")
    if db.uno("SELECT 1 FROM equipo WHERE id_torneo=%s LIMIT 1", (id_torneo,)):
        raise conflicto("No se puede borrar un torneo que tiene equipos inscriptos; borrá los equipos primero")
    db.ejecutar("DELETE FROM sancion_jugador WHERE id_torneo=%s", (id_torneo,))
    db.ejecutar("DELETE FROM torneo WHERE id_torneo=%s", (id_torneo,))


@router.patch("/{id_torneo}/estado")
def cambiar_estado(id_torneo: int, body: EstadoIn, db=Depends(solo_admin)):
    actual = util.torneo(db, id_torneo)["estado"]
    if ESTADOS.index(body.estado) != ESTADOS.index(actual) + 1:
        raise conflicto(f"El torneo solo avanza de etapa en orden (está en '{actual}')")

    if body.estado == "en_curso":
        # Antes de empezar, todos los equipos tienen que estar completos
        equipos = db.todos(
            "SELECT e.nombre, e.ci_capitan, COUNT(ejt.ci_jugador) AS cantidad FROM equipo e "
            "LEFT JOIN equipo_jugador_torneo ejt ON ejt.id_equipo = e.id_equipo "
            "WHERE e.id_torneo = %s GROUP BY e.id_equipo, e.nombre, e.ci_capitan", (id_torneo,))
        if len(equipos) < 2:
            raise conflicto("El torneo necesita al menos 2 equipos para empezar")
        for e in equipos:
            if not 5 <= e["cantidad"] <= 10:
                raise conflicto(f"El equipo {e['nombre']} tiene {e['cantidad']} jugadores (deben ser de 5 a 10)")
            if e["ci_capitan"] is None:
                raise conflicto(f"El equipo {e['nombre']} no tiene capitán asignado")

    if body.estado == "finalizado" and db.uno(
            "SELECT 1 FROM partido WHERE id_torneo=%s AND estado IN ('programado','postergado') LIMIT 1",
            (id_torneo,)):
        raise conflicto("Quedan partidos programados o postergados; jugalos o cancelalos antes de finalizar")

    db.ejecutar("UPDATE torneo SET estado=%s WHERE id_torneo=%s", (body.estado, id_torneo))
    return util.torneo(db, id_torneo)
