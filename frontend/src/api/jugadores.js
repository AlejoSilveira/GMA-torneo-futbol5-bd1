import { pedir, USAR_MOCK } from "./client";

const facultadesPrueba = [
  { id_facultad: 1, nombre: "Ingeniería y Tecnologías" },
  { id_facultad: 2, nombre: "Ciencias Empresariales" },
  { id_facultad: 3, nombre: "Derecho" },
];

let jugadoresPrueba = [
  { ci: "12345678", nombre: "Juan", apellido: "Pérez", email: "juan.perez@correo.ucu.edu.uy", fecha_nacimiento: "2004-05-10", id_facultad: 1, tipo: "grado" },
  { ci: "34567890", nombre: "Martín", apellido: "Rodríguez", email: "martin.rodriguez@ucu.edu.uy", fecha_nacimiento: "1985-02-14", id_facultad: 1, tipo: "docente" },
  { ci: "45678901", nombre: "Sofía", apellido: "Martínez", email: "sofia.martinez@correo.ucu.edu.uy", fecha_nacimiento: "2003-11-02", id_facultad: 1, tipo: "grado" },
  { ci: "56789012", nombre: "Diego", apellido: "Fernández", email: "diego.fernandez@correo.ucu.edu.uy", fecha_nacimiento: "2002-07-19", id_facultad: 1, tipo: "grado" },
  { ci: "67890123", nombre: "Camila", apellido: "López", email: "camila.lopez@correo.ucu.edu.uy", fecha_nacimiento: "1998-01-30", id_facultad: 1, tipo: "posgrado" },
  { ci: "78901234", nombre: "Nicolás", apellido: "García", email: "nicolas.garcia@correo.ucu.edu.uy", fecha_nacimiento: "2005-03-08", id_facultad: 1, tipo: "grado" },
  { ci: "89012345", nombre: "Valentina", apellido: "Sosa", email: "valentina.sosa@ucu.edu.uy", fecha_nacimiento: "1990-09-12", id_facultad: 1, tipo: "funcionario" },
  { ci: "90123456", nombre: "Federico", apellido: "Díaz", email: "federico.diaz@ucu.edu.uy", fecha_nacimiento: "1982-12-05", id_facultad: 1, tipo: "docente" },
  { ci: "23456789", nombre: "Lucía", apellido: "Gómez", email: "lucia.gomez@correo.ucu.edu.uy", fecha_nacimiento: "2003-08-21", id_facultad: 2, tipo: "posgrado" },
  { ci: "11223344", nombre: "Agustín", apellido: "Pereira", email: "agustin.pereira@correo.ucu.edu.uy", fecha_nacimiento: "2004-04-17", id_facultad: 2, tipo: "grado" },
  { ci: "22334455", nombre: "Florencia", apellido: "Silva", email: "florencia.silva@correo.ucu.edu.uy", fecha_nacimiento: "2003-06-25", id_facultad: 2, tipo: "grado" },
  { ci: "33445566", nombre: "Matías", apellido: "Castro", email: "matias.castro@correo.ucu.edu.uy", fecha_nacimiento: "2002-10-03", id_facultad: 2, tipo: "grado" },
  { ci: "44556677", nombre: "Joaquín", apellido: "Núñez", email: "joaquin.nunez@correo.ucu.edu.uy", fecha_nacimiento: "2004-02-11", id_facultad: 3, tipo: "grado" },
  { ci: "55667788", nombre: "Micaela", apellido: "Ramos", email: "micaela.ramos@correo.ucu.edu.uy", fecha_nacimiento: "2003-05-29", id_facultad: 3, tipo: "grado" },
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