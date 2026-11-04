import { pedir, USAR_MOCK } from "./client";

const facultadesPrueba = [
  { id_facultad: 1, nombre: "Ingeniería y Tecnologías" },
  { id_facultad: 2, nombre: "Ciencias Empresariales" },
  { id_facultad: 3, nombre: "Derecho" },
];

let jugadoresPrueba = [
  { ci: "12345678", nombre: "Juan", apellido: "Pérez", email: "juan.perez@correo.ucu.edu.uy", fecha_nacimiento: "2004-05-10", id_facultad: 1, tipo: "grado" },
  { ci: "23456789", nombre: "Lucía", apellido: "Gómez", email: "lucia.gomez@correo.ucu.edu.uy", fecha_nacimiento: "2003-08-21", id_facultad: 2, tipo: "posgrado" },
  { ci: "34567890", nombre: "Martín", apellido: "Rodríguez", email: "martin.rodriguez@ucu.edu.uy", fecha_nacimiento: "1985-02-14", id_facultad: 1, tipo: "docente" },
];

export async function listarFacultades() {
  if (USAR_MOCK) {
    return facultadesPrueba;
  }
  return pedir("/facultades");
}

export async function listarJugadores() {
  if (USAR_MOCK) {
    return [...jugadoresPrueba];
  }
  return pedir("/jugadores");
}

export async function crearJugador(jugador) {
  if (USAR_MOCK) {
    const existe = jugadoresPrueba.find((j) => j.ci === jugador.ci);
    if (existe) {
      throw new Error("Ya existe un jugador con esa cédula");
    }
    jugadoresPrueba.push(jugador);
    return jugador;
  }
  return pedir("/jugadores", "POST", jugador);
}

export async function editarJugador(ci, jugador) {
  if (USAR_MOCK) {
    jugadoresPrueba = jugadoresPrueba.map((j) => {
      if (j.ci === ci) {
        return jugador;
      }
      return j;
    });
    return jugador;
  }
  return pedir("/jugadores/" + ci, "PUT", jugador);
}

export async function borrarJugador(ci) {
  if (USAR_MOCK) {
    jugadoresPrueba = jugadoresPrueba.filter((j) => j.ci !== ci);
    return null;
  }
  return pedir("/jugadores/" + ci, "DELETE");
}