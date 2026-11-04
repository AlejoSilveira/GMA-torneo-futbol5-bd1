import { pedir, USAR_MOCK } from "./client";
import { listarJugadores } from "./jugadores";
import { listarTorneos } from "./torneos";

let equiposPrueba = [
  { id_equipo: 1, nombre: "Ingeniería FC", id_torneo: 1, id_facultad: 1, ci_capitan: "12345678" },
  { id_equipo: 2, nombre: "Los Contadores", id_torneo: 1, id_facultad: 2, ci_capitan: null },
  { id_equipo: 3, nombre: "Ingeniería FC", id_torneo: 2, id_facultad: 1, ci_capitan: "78901234" },
];

let plantelesPrueba = [
  { id_equipo: 1, ci_jugador: "12345678", numero_camiseta: 10 },
  { id_equipo: 1, ci_jugador: "45678901", numero_camiseta: 7 },
  { id_equipo: 1, ci_jugador: "56789012", numero_camiseta: 9 },
  { id_equipo: 1, ci_jugador: "67890123", numero_camiseta: 5 },
  { id_equipo: 1, ci_jugador: "34567890", numero_camiseta: 1 },
  { id_equipo: 2, ci_jugador: "23456789", numero_camiseta: 4 },
  { id_equipo: 2, ci_jugador: "11223344", numero_camiseta: 8 },
  { id_equipo: 2, ci_jugador: "22334455", numero_camiseta: 11 },
  { id_equipo: 3, ci_jugador: "78901234", numero_camiseta: 3 },
];

let proximoId = 4;

// funciones de ayuda para el modo prueba

function buscarEquipo(id) {
  const equipo = equiposPrueba.find((e) => e.id_equipo === id);
  if (!equipo) {
    throw new Error("El equipo no existe");
  }
  return equipo;
}

async function controlarInscripcion(idTorneo) {
  const torneos = await listarTorneos();
  const torneo = torneos.find((t) => t.id_torneo === idTorneo);
  if (!torneo || torneo.estado !== "inscripcion") {
    throw new Error("Solo se pueden hacer cambios mientras el torneo está en inscripción");
  }
}

// equipos

export async function listarEquipos(idTorneo) {
  if (USAR_MOCK) {
    return equiposPrueba.filter((e) => e.id_torneo === idTorneo);
  }
  return pedir("/equipos?torneo=" + idTorneo);
}

export async function crearEquipo(equipo) {
  if (USAR_MOCK) {
    await controlarInscripcion(equipo.id_torneo);
    const nuevo = { ...equipo, id_equipo: proximoId, ci_capitan: null };
    proximoId = proximoId + 1;
    equiposPrueba.push(nuevo);
    return nuevo;
  }
  return pedir("/equipos", "POST", equipo);
}

export async function editarEquipo(id, datos) {
  if (USAR_MOCK) {
    const equipo = buscarEquipo(id);
    if (datos.ci_capitan) {
      const estaEnPlantel = plantelesPrueba.some(
        (p) => p.id_equipo === id && p.ci_jugador === datos.ci_capitan
      );
      if (!estaEnPlantel) {
        throw new Error("El capitán tiene que ser un jugador del plantel");
      }
    }
    equipo.nombre = datos.nombre;
    equipo.ci_capitan = datos.ci_capitan;
    return equipo;
  }
  return pedir("/equipos/" + id, "PUT", datos);
}

export async function borrarEquipo(id) {
  if (USAR_MOCK) {
    const equipo = buscarEquipo(id);
    await controlarInscripcion(equipo.id_torneo);
    plantelesPrueba = plantelesPrueba.filter((p) => p.id_equipo !== id);
    equiposPrueba = equiposPrueba.filter((e) => e.id_equipo !== id);
    return null;
  }
  return pedir("/equipos/" + id, "DELETE");
}

// plantel

export async function listarPlantel(idEquipo) {
  if (USAR_MOCK) {
    const jugadores = await listarJugadores();
    const plantel = plantelesPrueba.filter((p) => p.id_equipo === idEquipo);
    return plantel.map((p) => {
      const jugador = jugadores.find((j) => j.ci === p.ci_jugador);
      return {
        ci_jugador: p.ci_jugador,
        nombre: jugador ? jugador.nombre : "",
        apellido: jugador ? jugador.apellido : "",
        tipo: jugador ? jugador.tipo : "",
        numero_camiseta: p.numero_camiseta,
      };
    });
  }
  return pedir("/equipos/" + idEquipo + "/plantel");
}

export async function agregarAlPlantel(idEquipo, datos) {
  if (USAR_MOCK) {
    const equipo = buscarEquipo(idEquipo);
    await controlarInscripcion(equipo.id_torneo);

    const jugadores = await listarJugadores();
    const jugador = jugadores.find((j) => j.ci === datos.ci_jugador);
    if (!jugador) {
      throw new Error("El jugador no existe");
    }
    if (jugador.id_facultad !== equipo.id_facultad) {
      throw new Error("El jugador tiene que ser de la misma facultad que el equipo");
    }

    const equiposDelTorneo = equiposPrueba
      .filter((e) => e.id_torneo === equipo.id_torneo)
      .map((e) => e.id_equipo);
    const yaJuega = plantelesPrueba.some(
      (p) => p.ci_jugador === datos.ci_jugador && equiposDelTorneo.includes(p.id_equipo)
    );
    if (yaJuega) {
      throw new Error("El jugador ya integra un equipo en esta edición del torneo");
    }

    const plantel = plantelesPrueba.filter((p) => p.id_equipo === idEquipo);
    if (plantel.length >= 10) {
      throw new Error("El plantel ya tiene 10 jugadores, que es el máximo");
    }

    if (jugador.tipo === "docente" || jugador.tipo === "funcionario") {
      let cantidad = 0;
      for (const p of plantel) {
        const otro = jugadores.find((j) => j.ci === p.ci_jugador);
        if (otro && (otro.tipo === "docente" || otro.tipo === "funcionario")) {
          cantidad = cantidad + 1;
        }
      }
      if (cantidad >= 2) {
        throw new Error("El plantel ya tiene 2 docentes o funcionarios, que es el máximo");
      }
    }

    const numeroUsado = plantel.some((p) => p.numero_camiseta === datos.numero_camiseta);
    if (numeroUsado) {
      throw new Error("Ese número de camiseta ya lo usa otro jugador del equipo");
    }

    plantelesPrueba.push({ id_equipo: idEquipo, ...datos });
    return datos;
  }
  return pedir("/equipos/" + idEquipo + "/plantel", "POST", datos);
}

export async function cambiarCamiseta(idEquipo, ci, numero) {
  if (USAR_MOCK) {
    const equipo = buscarEquipo(idEquipo);
    await controlarInscripcion(equipo.id_torneo);
    const numeroUsado = plantelesPrueba.some(
      (p) => p.id_equipo === idEquipo && p.ci_jugador !== ci && p.numero_camiseta === numero
    );
    if (numeroUsado) {
      throw new Error("Ese número de camiseta ya lo usa otro jugador del equipo");
    }
    const fila = plantelesPrueba.find((p) => p.id_equipo === idEquipo && p.ci_jugador === ci);
    fila.numero_camiseta = numero;
    return fila;
  }
  return pedir("/equipos/" + idEquipo + "/plantel/" + ci, "PUT", { numero_camiseta: numero });
}

export async function quitarDelPlantel(idEquipo, ci) {
  if (USAR_MOCK) {
    const equipo = buscarEquipo(idEquipo);
    await controlarInscripcion(equipo.id_torneo);
    plantelesPrueba = plantelesPrueba.filter(
      (p) => !(p.id_equipo === idEquipo && p.ci_jugador === ci)
    );
    if (equipo.ci_capitan === ci) {
      equipo.ci_capitan = null;
    }
    return null;
  }
  return pedir("/equipos/" + idEquipo + "/plantel/" + ci, "DELETE");
}