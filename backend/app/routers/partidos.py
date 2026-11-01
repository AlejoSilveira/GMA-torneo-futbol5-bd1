from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .. import util
from ..errores import conflicto, invalido
from ..seguridad import ADMIN, admin_o_planillero, solo_admin, usuario_actual

router = APIRouter(prefix="/partidos", tags=["partidos"])

Estado = Literal["programado", "jugado", "postergado", "cancelado"]


class PartidoIn(BaseModel):
    id_torneo: int = Field(gt=0)
    numero_fecha: int = Field(ge=1, le=50)
    id_equipo_local: int = Field(gt=0)
    id_equipo_visitante: int = Field(gt=0)
    dia: date
    id_turno: int = Field(gt=0)
    nombre_cancha: str = Field(min_length=1, max_length=50)
    id_complejo: int = Field(gt=0)


class EstadoIn(BaseModel):
    estado: Estado


_SELECT = (
    "SELECT p.*, t.hora_inicio, t.hora_fin, el.nombre AS equipo_local, ev.nombre AS equipo_visitante, "
    f"{util.sql_goles('local')} AS goles_local, {util.sql_goles('visitante')} AS goles_visitante "
    "FROM partido p JOIN turno t ON t.id_turno = p.id_turno "
    "JOIN equipo el ON el.id_equipo = p.id_equipo_local "
    "JOIN equipo ev ON ev.id_equipo = p.id_equipo_visitante ")


def _formatear(p: dict) -> dict:
    p["hora_inicio"] = util.hhmm(p["hora_inicio"])
    p["hora_fin"] = util.hhmm(p["hora_fin"])
    return p


def _validar_programacion(db, p: PartidoIn, id_partido: int | None = None) -> None:
    """Reglas de la letra al programar o reprogramar. id_partido se excluye al reprogramar."""
    excluir = id_partido or 0
    torneo = util.torneo(db, p.id_torneo)
    if torneo["estado"] == "finalizado":
        raise conflicto("El torneo ya finalizó")
    if not torneo["fecha_inicio"] <= p.dia <= torneo["fecha_fin"]:
        raise conflicto("El día del partido tiene que estar dentro de las fechas del torneo")
    if p.id_equipo_local == p.id_equipo_visitante:
        raise conflicto("Un equipo no puede jugar contra sí mismo")

    for id_equipo in (p.id_equipo_local, p.id_equipo_visitante):
        e = util.obtener(db, "SELECT e.nombre, e.id_torneo, COUNT(ejt.ci_jugador) AS cantidad FROM equipo e "
                             "LEFT JOIN equipo_jugador_torneo ejt ON ejt.id_equipo = e.id_equipo "
                             "WHERE e.id_equipo=%s GROUP BY e.id_equipo, e.nombre, e.id_torneo",
                         (id_equipo,), f"el equipo {id_equipo}")
        if e["id_torneo"] != p.id_torneo:
            raise conflicto(f"El equipo {e['nombre']} no pertenece a esta edición del torneo")
        if e["cantidad"] < 5:
            raise conflicto(f"El equipo {e['nombre']} tiene menos de 5 jugadores")

    if not db.uno("SELECT 1 FROM turno WHERE id_turno=%s", (p.id_turno,)):
        raise invalido("El turno no existe")
    if not db.uno("SELECT 1 FROM cancha WHERE id_complejo=%s AND nombre_cancha=%s",
                  (p.id_complejo, p.nombre_cancha)):
        raise invalido("La cancha no existe en ese complejo")

    if db.uno("SELECT 1 FROM partido WHERE id_torneo=%s AND estado <> 'cancelado' AND id_partido <> %s "
              "AND ((id_equipo_local=%s AND id_equipo_visitante=%s) OR (id_equipo_local=%s AND id_equipo_visitante=%s))",
              (p.id_torneo, excluir, p.id_equipo_local, p.id_equipo_visitante,
               p.id_equipo_visitante, p.id_equipo_local)):
        raise conflicto("Estos equipos ya tienen un partido en esta edición")
    if db.uno("SELECT 1 FROM partido WHERE id_torneo=%s AND numero_fecha=%s AND estado <> 'cancelado' "
              "AND id_partido <> %s AND (id_equipo_local IN (%s, %s) OR id_equipo_visitante IN (%s, %s))",
              (p.id_torneo, p.numero_fecha, excluir, p.id_equipo_local, p.id_equipo_visitante,
               p.id_equipo_local, p.id_equipo_visitante)):
        raise conflicto(f"Alguno de los equipos ya juega otro partido en la fecha {p.numero_fecha}")
    if db.uno("SELECT 1 FROM partido WHERE id_complejo=%s AND nombre_cancha=%s AND dia=%s AND id_turno=%s "
              "AND estado <> 'cancelado' AND id_partido <> %s",
              (p.id_complejo, p.nombre_cancha, p.dia, p.id_turno, excluir)):
        raise conflicto("La cancha ya tiene un partido ese día en ese turno")


@router.get("")
def listar(torneo: int | None = None, fecha: int | None = None, estado: Estado | None = None,
           db=Depends(admin_o_planillero)):
    sql = _SELECT + ("WHERE (%s IS NULL OR p.id_torneo=%s) AND (%s IS NULL OR p.numero_fecha=%s) "
                     "AND (%s IS NULL OR p.estado=%s) ORDER BY p.dia, t.hora_inicio, p.id_partido")
    return [_formatear(p) for p in db.todos(sql, (torneo, torneo, fecha, fecha, estado, estado))]


@router.get("/{id_partido}")
def detalle(id_partido: int, db=Depends(admin_o_planillero)):
    p = util.obtener(db, _SELECT + "WHERE p.id_partido=%s", (id_partido,), "el partido")
    p["planilla"] = db.todos(
        "SELECT pp.ci_jugador, pp.id_equipo, j.nombre, j.apellido FROM planilla_partido pp "
        "JOIN jugador j ON j.ci = pp.ci_jugador WHERE pp.id_partido=%s ORDER BY pp.id_equipo, j.apellido",
        (id_partido,))
    p["goles"] = db.todos("SELECT * FROM gol WHERE id_partido=%s ORDER BY minuto", (id_partido,))
    p["tarjetas"] = db.todos("SELECT * FROM tarjeta WHERE id_partido=%s ORDER BY minuto", (id_partido,))
    for g in p["goles"]:
        g["autogol"] = bool(g["autogol"])
    return _formatear(p)


@router.post("", status_code=201)
def programar(body: PartidoIn, db=Depends(solo_admin)):
    _validar_programacion(db, body)
    _, nuevo_id = db.ejecutar(
        "INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, "
        "nombre_cancha, id_complejo, estado) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'programado')",
        (body.id_torneo, body.numero_fecha, body.id_equipo_local, body.id_equipo_visitante, body.dia,
         body.id_turno, body.nombre_cancha, body.id_complejo))
    return detalle(nuevo_id, db)


@router.put("/{id_partido}")
def reprogramar(id_partido: int, body: PartidoIn, db=Depends(solo_admin)):
    actual = util.partido_con_turno(db, id_partido, bloquear=True)
    if actual["estado"] == "jugado":
        raise conflicto("Un partido jugado no se puede reprogramar")
    if body.id_torneo != actual["id_torneo"]:
        raise conflicto("No se puede mover un partido a otra edición del torneo")
    _validar_programacion(db, body, id_partido)
    # Si estaba postergado y se le da nueva fecha, vuelve a 'programado'
    db.ejecutar("UPDATE partido SET numero_fecha=%s, id_equipo_local=%s, id_equipo_visitante=%s, dia=%s, "
                "id_turno=%s, nombre_cancha=%s, id_complejo=%s, "
                "estado = IF(estado='postergado', 'programado', estado) WHERE id_partido=%s",
                (body.numero_fecha, body.id_equipo_local, body.id_equipo_visitante, body.dia, body.id_turno,
                 body.nombre_cancha, body.id_complejo, id_partido))
    return detalle(id_partido, db)


@router.delete("/{id_partido}", status_code=204)
def borrar(id_partido: int, db=Depends(solo_admin)):
    p = util.partido_con_turno(db, id_partido, bloquear=True)
    if p["estado"] == "jugado":
        raise conflicto("Un partido jugado no se puede eliminar")
    if db.uno("SELECT 1 FROM planilla_partido WHERE id_partido=%s LIMIT 1", (id_partido,)):
        raise conflicto("El partido tiene planilla cargada; quitala antes de borrarlo")
    db.ejecutar("DELETE FROM partido WHERE id_partido=%s", (id_partido,))


@router.patch("/{id_partido}/estado")
def cambiar_estado(id_partido: int, body: EstadoIn, db=Depends(admin_o_planillero),
                   usuario: dict = Depends(usuario_actual)):
    # Sin FOR UPDATE: el usuario MySQL planillero no tiene permiso para lecturas con bloqueo
    p = util.partido_con_turno(db, id_partido)
    if p["estado"] == body.estado:
        return detalle(id_partido, db)
    if p["estado"] == "jugado":
        raise conflicto("Un partido jugado no puede cambiar de estado")
    if p["estado"] == "cancelado":
        raise conflicto("Un partido cancelado no puede cambiar de estado")
    if body.estado == "jugado":
        _, fin = util.inicio_y_fin_partido(p)
        if util.ahora() < fin:
            raise conflicto("Solo se puede marcar como jugado cuando ya pasaron su día y turno")
    elif usuario["rol"] != ADMIN:
        # El planillero solo informa que el partido se jugó; postergar o cancelar es de la organización
        raise conflicto("Solo un administrador puede postergar, cancelar o reprogramar partidos")
    db.ejecutar("UPDATE partido SET estado=%s WHERE id_partido=%s", (body.estado, id_partido))
    return detalle(id_partido, db)
