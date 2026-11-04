import { pedir, USAR_MOCK } from "./client";

let complejosPrueba = [
  { id_complejo: 1, nombre: "Complejo Central", direccion: "Av. 8 de Octubre 2738", departamento: "Montevideo" },
  { id_complejo: 2, nombre: "Fútbol Parque", direccion: "Av. Italia 4500", departamento: "Montevideo" },
];

let canchasPrueba = [
  { id_complejo: 1, nombre_cancha: "Cancha 1", superficie: "sintetico", techada: false },
  { id_complejo: 1, nombre_cancha: "Cancha 2", superficie: "parquet", techada: true },
  { id_complejo: 2, nombre_cancha: "Cancha A", superficie: "sintetico", techada: true },
];

let proximoId = 3;

// complejos

export async function listarComplejos() {
  if (USAR_MOCK) {
    return [...complejosPrueba];
  }
  return pedir("/complejos");
}

export async function crearComplejo(complejo) {
  if (USAR_MOCK) {
    const nuevo = { ...complejo, id_complejo: proximoId };
    proximoId = proximoId + 1;
    complejosPrueba.push(nuevo);
    return nuevo;
  }
  return pedir("/complejos", "POST", complejo);
}

export async function editarComplejo(id, complejo) {
  if (USAR_MOCK) {
    complejosPrueba = complejosPrueba.map((c) => {
      if (c.id_complejo === id) {
        return { ...complejo, id_complejo: id };
      }
      return c;
    });
    return complejo;
  }
  return pedir("/complejos/" + id, "PUT", complejo);
}

export async function borrarComplejo(id) {
  if (USAR_MOCK) {
    const tieneCanchas = canchasPrueba.some((c) => c.id_complejo === id);
    if (tieneCanchas) {
      throw new Error("No se puede borrar un complejo que tiene canchas");
    }
    complejosPrueba = complejosPrueba.filter((c) => c.id_complejo !== id);
    return null;
  }
  return pedir("/complejos/" + id, "DELETE");
}

// canchas

export async function listarCanchas(idComplejo) {
  if (USAR_MOCK) {
    return canchasPrueba.filter((c) => c.id_complejo === idComplejo);
  }
  return pedir("/complejos/" + idComplejo + "/canchas");
}

export async function crearCancha(idComplejo, cancha) {
  if (USAR_MOCK) {
    const existe = canchasPrueba.find(
      (c) => c.id_complejo === idComplejo && c.nombre_cancha === cancha.nombre_cancha
    );
    if (existe) {
      throw new Error("Ya existe una cancha con ese nombre en este complejo");
    }
    canchasPrueba.push({ ...cancha, id_complejo: idComplejo });
    return cancha;
  }
  return pedir("/complejos/" + idComplejo + "/canchas", "POST", cancha);
}

export async function editarCancha(idComplejo, nombre, cancha) {
  if (USAR_MOCK) {
    canchasPrueba = canchasPrueba.map((c) => {
      if (c.id_complejo === idComplejo && c.nombre_cancha === nombre) {
        return { ...cancha, id_complejo: idComplejo, nombre_cancha: nombre };
      }
      return c;
    });
    return cancha;
  }
  return pedir("/complejos/" + idComplejo + "/canchas/" + encodeURIComponent(nombre), "PUT", cancha);
}

export async function borrarCancha(idComplejo, nombre) {
  if (USAR_MOCK) {
    canchasPrueba = canchasPrueba.filter(
      (c) => !(c.id_complejo === idComplejo && c.nombre_cancha === nombre)
    );
    return null;
  }
  return pedir("/complejos/" + idComplejo + "/canchas/" + encodeURIComponent(nombre), "DELETE");
}