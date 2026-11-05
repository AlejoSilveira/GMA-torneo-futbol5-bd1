import { pedir, USAR_MOCK } from "./client";

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

export async function listarSanciones(idTorneo) {
  if (USAR_MOCK) {
    return sancionesPrueba.filter((s) => s.id_torneo === idTorneo);
  }
  return pedir("/sanciones?torneo=" + idTorneo);
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