import { pedir, USAR_MOCK } from "./client";
import { listarEquipos, listarPlantel } from "./equipos";

// devuelve la fecha de hoy más (o menos) una cantidad de días, en formato YYYY-MM-DD
function fechaDesdeHoy(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return anio + "-" + mes + "-" + dia;
}

const turnosPrueba = [
  { id_turno: 1, hora_inicio: "18:00", hora_fin: "19:00" },
  { id_turno: 2, hora_inicio: "19:00", hora_fin: "20:00" },
  { id_turno: 3, hora_inicio: "20:00", hora_fin: "21:00" },
  { id_turno: 4, hora_inicio: "21:00", hora_fin: "22:00" },
  { id_turno: 5, hora_inicio: "22:00", hora_fin: "23:00" },
];

let partidosPrueba = [
  {
    id_partido: 1, id_torneo: 1, numero_fecha: 1,
    id_equipo_local: 1, id_equipo_visitante: 2,
    dia: fechaDesdeHoy(-9), id_turno: 2, nombre_cancha: "Cancha 1", id_complejo: 1,
    estado: "cancelado", goles_local: 0, goles_visitante: 0,
  },
  {
    id_partido: 2, id_torneo: 1, numero_fecha: 2,
    id_equipo_local: 2, id_equipo_visitante: 1,
    dia: fechaDesdeHoy(-1), id_turno: 3, nombre_cancha: "Cancha 2", id_complejo: 1,
    estado: "programado", goles_local: 0, goles_visitante: 0,
  },
];

let proximoId = 3;

export async function listarTurnos() {
  if (USAR_MOCK) {
    return turnosPrueba;
  }
  return pedir("/turnos");
}

// reglas de la letra para programar un partido (solo modo prueba)
async function validarPartido(p, idIgnorar) {
  if (p.id_equipo_local === p.id_equipo_visitante) {
    throw new Error("Un equipo no puede jugar contra sí mismo");
  }

  const equipos = await listarEquipos(p.id_torneo);
  const local = equipos.find((e) => e.id_equipo === p.id_equipo_local);
  const visitante = equipos.find((e) => e.id_equipo === p.id_equipo_visitante);
  if (!local || !visitante) {
    throw new Error("Los dos equipos tienen que pertenecer a la misma edición del torneo");
  }

  const plantelLocal = await listarPlantel(local.id_equipo);
  const plantelVisitante = await listarPlantel(visitante.id_equipo);
  if (plantelLocal.length < 5) {
    throw new Error(local.nombre + " tiene menos de 5 jugadores en su plantel");
  }
  if (plantelVisitante.length < 5) {
    throw new Error(visitante.nombre + " tiene menos de 5 jugadores en su plantel");
  }

  const otros = partidosPrueba.filter(
    (x) => x.id_torneo === p.id_torneo && x.id_partido !== idIgnorar && x.estado !== "cancelado"
  );

  const cruceRepetido = otros.some(
    (x) =>
      (x.id_equipo_local === p.id_equipo_local && x.id_equipo_visitante === p.id_equipo_visitante) ||
      (x.id_equipo_local === p.id_equipo_visitante && x.id_equipo_visitante === p.id_equipo_local)
  );
  if (cruceRepetido) {
    throw new Error("Estos equipos ya tienen un partido en esta edición");
  }

  const juegaEsaFecha = otros.some(
    (x) =>
      x.numero_fecha === p.numero_fecha &&
      (x.id_equipo_local === p.id_equipo_local || x.id_equipo_visitante === p.id_equipo_local ||
       x.id_equipo_local === p.id_equipo_visitante || x.id_equipo_visitante === p.id_equipo_visitante)
  );
  if (juegaEsaFecha) {
    throw new Error("Uno de los equipos ya tiene un partido en la fecha " + p.numero_fecha);
  }

  const canchaOcupada = partidosPrueba.some(
    (x) =>
      x.id_partido !== idIgnorar &&
      x.estado !== "cancelado" &&
      x.id_complejo === p.id_complejo &&
      x.nombre_cancha === p.nombre_cancha &&
      x.dia === p.dia &&
      x.id_turno === p.id_turno
  );
  if (canchaOcupada) {
    throw new Error("La cancha ya tiene un partido ese día en ese turno");
  }
}

function buscarPartido(id) {
  const partido = partidosPrueba.find((x) => x.id_partido === id);
  if (!partido) {
    throw new Error("El partido no existe");
  }
  return partido;
}

export async function listarPartidos(idTorneo) {
  if (USAR_MOCK) {
    const lista = partidosPrueba.filter((x) => x.id_torneo === idTorneo);
    lista.sort((a, b) => {
      if (a.numero_fecha !== b.numero_fecha) {
        return a.numero_fecha - b.numero_fecha;
      }
      return a.dia.localeCompare(b.dia);
    });
    return lista.map((x) => ({ ...x }));
  }
  return pedir("/partidos?torneo=" + idTorneo);
}

export async function crearPartido(partido) {
  if (USAR_MOCK) {
    await validarPartido(partido, null);
    const nuevo = {
      ...partido,
      id_partido: proximoId,
      estado: "programado",
      goles_local: 0,
      goles_visitante: 0,
    };
    proximoId = proximoId + 1;
    partidosPrueba.push(nuevo);
    return nuevo;
  }
  return pedir("/partidos", "POST", partido);
}

export async function editarPartido(id, datos) {
  if (USAR_MOCK) {
    const partido = buscarPartido(id);
    if (partido.estado === "jugado") {
      throw new Error("Un partido jugado no se puede reprogramar");
    }
    await validarPartido(datos, id);
    Object.assign(partido, datos);
    if (partido.estado === "postergado") {
      partido.estado = "programado";
    }
    return partido;
  }
  return pedir("/partidos/" + id, "PUT", datos);
}

export async function borrarPartido(id) {
  if (USAR_MOCK) {
    const partido = buscarPartido(id);
    if (partido.estado === "jugado") {
      throw new Error("Un partido jugado no se puede eliminar");
    }
    partidosPrueba = partidosPrueba.filter((x) => x.id_partido !== id);
    return null;
  }
  return pedir("/partidos/" + id, "DELETE");
}

export async function cambiarEstadoPartido(id, estado) {
  if (USAR_MOCK) {
    const partido = buscarPartido(id);
    if (partido.estado === "jugado") {
      throw new Error("Un partido jugado no puede cambiar de estado");
    }
    if (estado === "jugado") {
      const turno = turnosPrueba.find((t) => t.id_turno === partido.id_turno);
      const fin = new Date(partido.dia + "T" + turno.hora_fin);
      if (fin > new Date()) {
        throw new Error("Solo se puede marcar como jugado un partido cuyo día y turno ya pasaron");
      }
    }
    partido.estado = estado;
    return partido;
  }
  return pedir("/partidos/" + id + "/estado", "PATCH", { estado: estado });
}

export async function obtenerPartido(id) {
  if (USAR_MOCK) {
    return { ...buscarPartido(id) };
  }
  return pedir("/partidos/" + id);
}

// solo para el modo prueba: la planilla actualiza el resultado cuando cambian los goles
export function actualizarResultadoPrueba(id, golesLocal, golesVisitante) {
  const partido = partidosPrueba.find((x) => x.id_partido === id);
  if (partido) {
    partido.goles_local = golesLocal;
    partido.goles_visitante = golesVisitante;
  }
}