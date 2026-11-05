import { pedir, USAR_MOCK } from "./client";
import { listarPlantel } from "./equipos";
import { obtenerPartido, listarPartidos, listarTurnos, actualizarResultadoPrueba } from "./partidos";
import { listarSanciones, estaSuspendido, crearSancionAutomaticaPrueba } from "./sanciones";

let planillaPrueba = [];
let golesPrueba = [];
let tarjetasPrueba = [];
let proximoGol = 1;
let proximaTarjeta = 1;

// controles comunes (solo modo prueba)

async function controlarPartidoEditable(idPartido) {
  const partido = await obtenerPartido(idPartido);

  if (partido.estado === "cancelado" || partido.estado === "postergado") {
    throw new Error("No se puede cargar la planilla de un partido " + partido.estado);
  }

  const turnos = await listarTurnos();
  const turno = turnos.find((t) => t.id_turno === partido.id_turno);
  const fin = new Date(partido.dia + "T" + turno.hora_fin);
  const ahora = new Date();

  if (fin > ahora) {
    throw new Error("El partido todavía no se jugó, la planilla se carga cuando termina");
  }

  const limite = new Date(fin.getTime() + 48 * 60 * 60 * 1000);
  if (partido.estado === "jugado" && ahora > limite) {
    throw new Error("Pasaron más de 48 horas desde el partido, ya no se puede corregir");
  }

  return partido;
}

function filaPlanilla(idPartido, ci) {
  return planillaPrueba.find((p) => p.id_partido === idPartido && p.ci_jugador === ci);
}

function minutoValido(minuto) {
  return Number.isInteger(minuto) && minuto >= 0 && minuto <= 60;
}

// el resultado sale de los goles: un autogol suma para el rival
function recalcularResultado(partido) {
  let local = 0;
  let visitante = 0;
  const goles = golesPrueba.filter((g) => g.id_partido === partido.id_partido);
  for (const g of goles) {
    const fila = filaPlanilla(partido.id_partido, g.ci_jugador);
    let equipoQueSuma = fila.id_equipo;
    if (g.autogol) {
      if (fila.id_equipo === partido.id_equipo_local) {
        equipoQueSuma = partido.id_equipo_visitante;
      } else {
        equipoQueSuma = partido.id_equipo_local;
      }
    }
    if (equipoQueSuma === partido.id_equipo_local) {
      local = local + 1;
    } else {
      visitante = visitante + 1;
    }
  }
  actualizarResultadoPrueba(partido.id_partido, local, visitante);
}

// planilla

export async function listarPlanilla(idPartido) {
  if (USAR_MOCK) {
    return planillaPrueba.filter((p) => p.id_partido === idPartido);
  }
  return pedir("/partidos/" + idPartido + "/planilla");
}

export async function agregarAPlanilla(idPartido, datos) {
  if (USAR_MOCK) {
    const partido = await controlarPartidoEditable(idPartido);

    if (datos.id_equipo !== partido.id_equipo_local && datos.id_equipo !== partido.id_equipo_visitante) {
      throw new Error("El equipo no juega este partido");
    }

    const plantel = await listarPlantel(datos.id_equipo);
    const enPlantel = plantel.some((p) => p.ci_jugador === datos.ci_jugador);
    if (!enPlantel) {
      throw new Error("El jugador no pertenece al plantel del equipo");
    }

    const sanciones = await listarSanciones(partido.id_torneo);
    if (estaSuspendido(sanciones, datos.ci_jugador, partido.numero_fecha)) {
      throw new Error("El jugador está suspendido para la fecha " + partido.numero_fecha);
    }

    if (filaPlanilla(idPartido, datos.ci_jugador)) {
      throw new Error("El jugador ya está en la planilla");
    }

    planillaPrueba.push({ id_partido: idPartido, ...datos });
    return datos;
  }
  return pedir("/partidos/" + idPartido + "/planilla", "POST", datos);
}

export async function quitarDePlanilla(idPartido, ci) {
  if (USAR_MOCK) {
    await controlarPartidoEditable(idPartido);
    const tieneGoles = golesPrueba.some((g) => g.id_partido === idPartido && g.ci_jugador === ci);
    const tieneTarjetas = tarjetasPrueba.some((t) => t.id_partido === idPartido && t.ci_jugador === ci);
    if (tieneGoles || tieneTarjetas) {
      throw new Error("Primero borrá los goles y tarjetas de este jugador");
    }
    planillaPrueba = planillaPrueba.filter((p) => !(p.id_partido === idPartido && p.ci_jugador === ci));
    return null;
  }
  return pedir("/partidos/" + idPartido + "/planilla/" + ci, "DELETE");
}

// goles

export async function listarGoles(idPartido) {
  if (USAR_MOCK) {
    const lista = golesPrueba.filter((g) => g.id_partido === idPartido);
    lista.sort((a, b) => a.minuto - b.minuto);
    return lista;
  }
  return pedir("/partidos/" + idPartido + "/goles");
}

export async function agregarGol(idPartido, datos) {
  if (USAR_MOCK) {
    const partido = await controlarPartidoEditable(idPartido);
    if (!filaPlanilla(idPartido, datos.ci_jugador)) {
      throw new Error("Solo pueden hacer goles los jugadores que están en la planilla");
    }
    if (!minutoValido(datos.minuto)) {
      throw new Error("El minuto tiene que estar entre 0 y 60");
    }
    golesPrueba.push({ id_gol: proximoGol, id_partido: idPartido, ...datos });
    proximoGol = proximoGol + 1;
    recalcularResultado(partido);
    return datos;
  }
  return pedir("/partidos/" + idPartido + "/goles", "POST", datos);
}

export async function borrarGol(idPartido, idGol) {
  if (USAR_MOCK) {
    const partido = await controlarPartidoEditable(idPartido);
    golesPrueba = golesPrueba.filter((g) => g.id_gol !== idGol);
    recalcularResultado(partido);
    return null;
  }
  return pedir("/goles/" + idGol, "DELETE");
}

// tarjetas

export async function listarTarjetas(idPartido) {
  if (USAR_MOCK) {
    const lista = tarjetasPrueba.filter((t) => t.id_partido === idPartido);
    lista.sort((a, b) => a.minuto - b.minuto);
    return lista;
  }
  return pedir("/partidos/" + idPartido + "/tarjetas");
}

export async function agregarTarjeta(idPartido, datos) {
  if (USAR_MOCK) {
    const partido = await controlarPartidoEditable(idPartido);
    if (!filaPlanilla(idPartido, datos.ci_jugador)) {
      throw new Error("Solo pueden recibir tarjetas los jugadores que están en la planilla");
    }
    if (!minutoValido(datos.minuto)) {
      throw new Error("El minuto tiene que estar entre 0 y 60");
    }

    tarjetasPrueba.push({ id_tarjeta: proximaTarjeta, id_partido: idPartido, ...datos });
    proximaTarjeta = proximaTarjeta + 1;

    // esto lo va a hacer un trigger en la base
    if (datos.color === "roja") {
      crearSancionAutomaticaPrueba(datos.ci_jugador, partido.id_torneo, "roja", partido.numero_fecha);
    } else {
      const partidosDelTorneo = await listarPartidos(partido.id_torneo);
      const ids = partidosDelTorneo.map((x) => x.id_partido);
      const amarillas = tarjetasPrueba.filter(
        (t) => t.ci_jugador === datos.ci_jugador && t.color === "amarilla" && ids.includes(t.id_partido)
      );
      if (amarillas.length % 3 === 0) {
        crearSancionAutomaticaPrueba(datos.ci_jugador, partido.id_torneo, "acumulacion_amarillas", partido.numero_fecha);
      }
    }
    return datos;
  }
  return pedir("/partidos/" + idPartido + "/tarjetas", "POST", datos);
}

export async function borrarTarjeta(idPartido, idTarjeta) {
  if (USAR_MOCK) {
    await controlarPartidoEditable(idPartido);
    tarjetasPrueba = tarjetasPrueba.filter((t) => t.id_tarjeta !== idTarjeta);
    return null;
  }
  return pedir("/tarjetas/" + idTarjeta, "DELETE");
}