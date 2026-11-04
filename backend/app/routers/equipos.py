from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .. import util
from ..errores import conflicto, invalido
from ..seguridad import admin_o_planillero, solo_admin

router = APIRouter(prefix="/equipos", tags=["equipos"])

MAX_PLANTEL = 10
MAX_DOCENTES_FUNCIONARIOS = 2


class EquipoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    id_torneo: int = Field(gt=0)
    id_facultad: int = Field(gt=0)
    ci_capitan: str | None = Field(default=None, pattern=util.PATRON_CI)


class EquipoUpdate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    ci_capitan: str | None = Field(default=None, pattern=util.PATRON_CI)


class PlantelIn(BaseModel):
    ci_jugador: str = Field(pattern=util.PATRON_CI)
    numero_camiseta: int = Field(ge=1, le=99)


class CamisetaIn(BaseModel):
    numero_camiseta: int = Field(ge=1, le=99)


def _equipo(db, id_equipo: int) -> dict:
    return util.obtener(db, "SELECT * FROM equipo WHERE id_equipo = %s", (id_equipo,), "el equipo")


def _plantel(db, id_equipo: int) -> list[dict]:
    return db.todos(
        "SELECT ejt.ci_jugador, j.nombre, j.apellido, j.tipo, ejt.numero_camiseta "
        "FROM equipo_jugador_torneo ejt JOIN jugador j ON j.ci = ejt.ci_jugador "
        "WHERE ejt.id_equipo = %s ORDER BY ejt.numero_camiseta", (id_equipo,))


def _en_plantel(db, id_equipo: int, ci: str) -> bool:
    return db.uno("SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo=%s AND ci_jugador=%s",
                  (id_equipo, ci)) is not None


def _camiseta_libre(db, id_equipo: int, numero: int, ci_excepto: str | None = None) -> None:
    if db.uno("SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo=%s AND numero_camiseta=%s "
              "AND ci_jugador <> COALESCE(%s, '')", (id_equipo, numero, ci_excepto)):
        raise conflicto(f"La camiseta {numero} ya la usa otro jugador del equipo")


@router.get("")
def listar(torneo: int, db=Depends(admin_o_planillero)):
    return db.todos(
        "SELECT e.*, f.nombre AS facultad, "
        "(SELECT COUNT(*) FROM equipo_jugador_torneo x WHERE x.id_equipo = e.id_equipo) AS cantidad_jugadores "
        "FROM equipo e JOIN facultad f ON f.id_facultad = e.id_facultad "
        "WHERE e.id_torneo = %s ORDER BY e.nombre", (torneo,))


@router.get("/{id_equipo}")
def detalle(id_equipo: int, db=Depends(admin_o_planillero)):
    equipo = _equipo(db, id_equipo)
    equipo["plantel"] = _plantel(db, id_equipo)
    return equipo


@router.post("", status_code=201)
def crear(e: EquipoIn, db=Depends(solo_admin)):
    util.exigir_inscripcion(db, e.id_torneo)
    if not db.uno("SELECT 1 FROM facultad WHERE id_facultad=%s", (e.id_facultad,)):
        raise invalido("La facultad no existe")
    if e.ci_capitan is not None:
        # Al crear, el plantel está vacío: el capitán se asigna después con PUT (acordado en el api.md)
        raise conflicto("El capitán tiene que estar en el plantel; asignalo después de agregar jugadores")
    _, nuevo_id = db.ejecutar(
        "INSERT INTO equipo (nombre, id_torneo, id_facultad, ci_capitan) VALUES (%s, %s, %s, NULL)",
        (e.nombre.strip(), e.id_torneo, e.id_facultad))
    return detalle(nuevo_id, db)


@router.put("/{id_equipo}")
def modificar(id_equipo: int, e: EquipoUpdate, db=Depends(solo_admin)):
    _equipo(db, id_equipo)
    if e.ci_capitan is not None and not _en_plantel(db, id_equipo, e.ci_capitan):
        raise conflicto("El capitán tiene que ser un jugador del plantel")
    db.ejecutar("UPDATE equipo SET nombre=%s, ci_capitan=%s WHERE id_equipo=%s",
                (e.nombre.strip(), e.ci_capitan, id_equipo))
    return detalle(id_equipo, db)


@router.delete("/{id_equipo}", status_code=204)
def borrar(id_equipo: int, db=Depends(solo_admin)):
    equipo = _equipo(db, id_equipo)
    util.exigir_inscripcion(db, equipo["id_torneo"])
    if db.uno("SELECT 1 FROM partido WHERE id_equipo_local=%s OR id_equipo_visitante=%s LIMIT 1",
              (id_equipo, id_equipo)):
        raise conflicto("No se puede borrar un equipo que ya tiene partidos programados")
    # El plantel es parte del equipo: se borra junto con él (todo dentro de la misma transacción)
    db.ejecutar("UPDATE equipo SET ci_capitan = NULL WHERE id_equipo=%s", (id_equipo,))
    db.ejecutar("DELETE FROM equipo_jugador_torneo WHERE id_equipo=%s", (id_equipo,))
    db.ejecutar("DELETE FROM equipo WHERE id_equipo=%s", (id_equipo,))


# ---------- Plantel ----------

@router.get("/{id_equipo}/plantel")
def ver_plantel(id_equipo: int, db=Depends(admin_o_planillero)):
    _equipo(db, id_equipo)
    return _plantel(db, id_equipo)


@router.post("/{id_equipo}/plantel", status_code=201)
def agregar_jugador(id_equipo: int, body: PlantelIn, db=Depends(solo_admin)):
    # FOR UPDATE: si dos admins agregan a la vez, no se pasan del máximo
    equipo = util.obtener(db, "SELECT * FROM equipo WHERE id_equipo=%s FOR UPDATE",
                          (id_equipo,), "el equipo")
    util.exigir_inscripcion(db, equipo["id_torneo"])
    jugador = util.obtener(db, "SELECT * FROM jugador WHERE ci=%s", (body.ci_jugador,), "el jugador")

    if jugador["id_facultad"] != equipo["id_facultad"]:
        raise conflicto("El jugador tiene que ser de la misma facultad que el equipo")
    otro = db.uno("SELECT e.nombre FROM equipo_jugador_torneo ejt JOIN equipo e ON e.id_equipo = ejt.id_equipo "
                  "WHERE ejt.ci_jugador=%s AND ejt.id_torneo=%s", (body.ci_jugador, equipo["id_torneo"]))
    if otro:
        raise conflicto(f"El jugador ya integra el equipo {otro['nombre']} en esta edición")

    plantel = _plantel(db, id_equipo)
    if len(plantel) >= MAX_PLANTEL:
        raise conflicto(f"El plantel ya tiene {MAX_PLANTEL} jugadores (máximo)")
    if jugador["tipo"] in ("docente", "funcionario") and sum(
            1 for p in plantel if p["tipo"] in ("docente", "funcionario")) >= MAX_DOCENTES_FUNCIONARIOS:
        raise conflicto(f"El plantel ya tiene {MAX_DOCENTES_FUNCIONARIOS} docentes/funcionarios (máximo)")
    _camiseta_libre(db, id_equipo, body.numero_camiseta)

    db.ejecutar("INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta) "
                "VALUES (%s, %s, %s, %s)",
                (id_equipo, body.ci_jugador, equipo["id_torneo"], body.numero_camiseta))
    return _plantel(db, id_equipo)


@router.put("/{id_equipo}/plantel/{ci}")
def cambiar_camiseta(id_equipo: int, ci: str, body: CamisetaIn, db=Depends(solo_admin)):
    equipo = _equipo(db, id_equipo)
    util.exigir_inscripcion(db, equipo["id_torneo"])
    if not _en_plantel(db, id_equipo, ci):
        raise conflicto("El jugador no está en el plantel")
    _camiseta_libre(db, id_equipo, body.numero_camiseta, ci)
    db.ejecutar("UPDATE equipo_jugador_torneo SET numero_camiseta=%s WHERE id_equipo=%s AND ci_jugador=%s",
                (body.numero_camiseta, id_equipo, ci))
    return _plantel(db, id_equipo)


@router.delete("/{id_equipo}/plantel/{ci}")
def quitar_jugador(id_equipo: int, ci: str, db=Depends(solo_admin)):
    equipo = _equipo(db, id_equipo)
    util.exigir_inscripcion(db, equipo["id_torneo"])
    if not _en_plantel(db, id_equipo, ci):
        raise conflicto("El jugador no está en el plantel")
    if equipo["ci_capitan"] == ci:
        raise conflicto("No se puede quitar al capitán; asigná otro capitán primero")
    # El mínimo de 5 no se controla acá (durante la inscripción el plantel se está armando);
    # se controla al programar partidos y al pasar el torneo a 'en_curso'.
    db.ejecutar("DELETE FROM equipo_jugador_torneo WHERE id_equipo=%s AND ci_jugador=%s", (id_equipo, ci))
    return _plantel(db, id_equipo)
