import { pedir, USAR_MOCK } from "./client";

let torneosPrueba = [
  {
    id_torneo: 1,
    nombre: "Torneo Interfacultades",
    anio: 2026,
    semestre: 2,
    fecha_inicio: "2026-09-01",
    fecha_fin: "2026-12-01",
    estado: "inscripcion",
  },
  {
    id_torneo: 2,
    nombre: "Torneo Interfacultades",
    anio: 2026,
    semestre: 1,
    fecha_inicio: "2026-03-15",
    fecha_fin: "2026-07-01",
    estado: "finalizado",
  },
];

let proximoId = 3;

// solo modo prueba
function controlarDatos(torneo, idIgnorar) {
  if (torneo.semestre !== 1 && torneo.semestre !== 2) {
    throw new Error("El semestre tiene que ser 1 o 2");
  }
  if (torneo.fecha_fin <= torneo.fecha_inicio) {
    throw new Error("La fecha de fin tiene que ser posterior a la de inicio");
  }
  const repetido = torneosPrueba.some(
    (t) => t.id_torneo !== idIgnorar && t.anio === torneo.anio && t.semestre === torneo.semestre
  );
  if (repetido) {
    throw new Error("Ya existe un torneo para ese año y semestre");
  }
}

function buscarTorneo(id) {
  const torneo = torneosPrueba.find((t) => t.id_torneo === id);
  if (!torneo) {
    throw new Error("El torneo no existe");
  }
  return torneo;
}

export async function listarTorneos() {
  if (USAR_MOCK) {
    const lista = torneosPrueba.map((t) => ({ ...t }));
    lista.sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
    return lista;
  }
  return pedir("/torneos");
}

export async function crearTorneo(torneo) {
  if (USAR_MOCK) {
    controlarDatos(torneo, null);
    const nuevo = { ...torneo, id_torneo: proximoId, estado: "inscripcion" };
    proximoId = proximoId + 1;
    torneosPrueba.push(nuevo);
    return nuevo;
  }
  return pedir("/torneos", "POST", torneo);
}

export async function editarTorneo(id, datos) {
  if (USAR_MOCK) {
    const torneo = buscarTorneo(id);
    controlarDatos(datos, id);
    torneo.nombre = datos.nombre;
    torneo.anio = datos.anio;
    torneo.semestre = datos.semestre;
    torneo.fecha_inicio = datos.fecha_inicio;
    torneo.fecha_fin = datos.fecha_fin;
    return torneo;
  }
  return pedir("/torneos/" + id, "PUT", datos);
}

export async function borrarTorneo(id) {
  if (USAR_MOCK) {
    const torneo = buscarTorneo(id);
    if (torneo.estado !== "inscripcion") {
      throw new Error("Solo se puede borrar un torneo que todavía está en inscripción");
    }
    torneosPrueba = torneosPrueba.filter((t) => t.id_torneo !== id);
    return null;
  }
  return pedir("/torneos/" + id, "DELETE");
}

export async function cambiarEstadoTorneo(id, estado) {
  if (USAR_MOCK) {
    const torneo = buscarTorneo(id);
    torneo.estado = estado;
    return torneo;
  }
  return pedir("/torneos/" + id + "/estado", "PATCH", { estado: estado });
}

// el nombre puede venir con la edición incluida (como en los datos de prueba) o sin ella
export function nombreTorneo(t) {
  if (t.nombre.includes(String(t.anio))) {
    return t.nombre;
  }
  return t.nombre + " " + t.anio + " - " + t.semestre + "º semestre";
}