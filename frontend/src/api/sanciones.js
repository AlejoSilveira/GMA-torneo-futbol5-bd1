import { pedir, USAR_MOCK } from "./client";
import { listarEquipos, listarPlantel } from "./equipos";

let sancionesPrueba = [
  {
    id_sancion: 1,
    ci_jugador: "56789012",
    id_torneo: 1,
    motivo: "disciplinaria",
    numero_fecha_inicio: 2,
    cantidad_fechas: 1,
  },
];

let proximoId = 2;

// solo modo prueba: controla que el jugador esté en algún equipo de ese torneo
async function controlarJugadorDelTorneo(ci, idTorneo) {
  const equipos = await listarEquipos(idTorneo);
  for (const equipo of equipos) {
    const plantel = await listarPlantel(equipo.id_equipo);
    if (plantel.some((p) => p.ci_jugador === ci)) {
      return;
    }
  }
  throw new Error("El jugador no integra ningún equipo en esta edición del torneo");
}

function controlarFechas(sancion) {
  if (!Number.isInteger(sancion.numero_fecha_inicio) || sancion.numero_fecha_inicio < 1) {
    throw new Error("La fecha de inicio tiene que ser un entero mayor a 0");
  }
  if (!Number.isInteger(sancion.cantidad_fechas) || sancion.cantidad_fechas < 1) {
    throw new Error("La cantidad de fechas tiene que ser un entero mayor a 0");
  }
}

export async function listarSanciones(idTorneo) {
  if (USAR_MOCK) {
    return sancionesPrueba.filter((s) => s.id_torneo === idTorneo).map((s) => ({ ...s }));
  }
  return pedir("/sanciones?torneo=" + idTorneo);
}

export async function crearSancion(sancion) {
  if (USAR_MOCK) {
    controlarFechas(sancion);
    await controlarJugadorDelTorneo(sancion.ci_jugador, sancion.id_torneo);
    const nueva = { ...sancion, id_sancion: proximoId };
    proximoId = proximoId + 1;
    sancionesPrueba.push(nueva);
    return nueva;
  }
  return pedir("/sanciones", "POST", sancion);
}

export async function editarSancion(id, datos) {
  if (USAR_MOCK) {
    controlarFechas(datos);
    const sancion = sancionesPrueba.find((s) => s.id_sancion === id);
    if (!sancion) {
      throw new Error("La sanción no existe");
    }
    sancion.numero_fecha_inicio = datos.numero_fecha_inicio;
    sancion.cantidad_fechas = datos.cantidad_fechas;
    return sancion;
  }
  return pedir("/sanciones/" + id, "PUT", datos);
}

export async function borrarSancion(id) {
  if (USAR_MOCK) {
    sancionesPrueba = sancionesPrueba.filter((s) => s.id_sancion !== id);
    return null;
  }
  return pedir("/sanciones/" + id, "DELETE");
}

// devuelve true si el jugador está suspendido en esa fecha del torneo
export function estaSuspendido(sanciones, ci, numeroFecha) {
  return sanciones.some(
    (s) =>
      s.ci_jugador === ci &&
      numeroFecha >= s.numero_fecha_inicio &&
      numeroFecha < s.numero_fecha_inicio + s.cantidad_fechas
  );
}

// solo para el modo prueba: imita el trigger de la base que crea las sanciones automáticas
export function crearSancionAutomaticaPrueba(ci, idTorneo, motivo, numeroFecha) {
  sancionesPrueba.push({
    id_sancion: proximoId,
    ci_jugador: ci,
    id_torneo: idTorneo,
    motivo: motivo,
    numero_fecha_inicio: numeroFecha + 1,
    cantidad_fechas: 1,
  });
  proximoId = proximoId + 1;
}