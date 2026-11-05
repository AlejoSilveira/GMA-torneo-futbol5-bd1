import { pedir, USAR_MOCK } from "./client";

// datos de ejemplo con las mismas columnas que devuelve el backend
const datosPrueba = {
  "posiciones": [
    { id_equipo: 1, equipo: "Ingeniería FC", pj: 3, pg: 2, pe: 1, pp: 0, gf: 8, gc: 3, dg: 5, puntos: 7 },
    { id_equipo: 2, equipo: "Los Contadores", pj: 3, pg: 1, pe: 1, pp: 1, gf: 5, gc: 5, dg: 0, puntos: 4 },
    { id_equipo: 5, equipo: "Psico Team", pj: 3, pg: 1, pe: 0, pp: 2, gf: 4, gc: 6, dg: -2, puntos: 3 },
    { id_equipo: 4, equipo: "Derecho United", pj: 3, pg: 0, pe: 2, pp: 1, gf: 3, gc: 6, dg: -3, puntos: 2 },
  ],
  "goleadores": [
    { ci: "12345678", nombre: "Juan", apellido: "Pérez", equipo: "Ingeniería FC", goles: 4 },
    { ci: "11223344", nombre: "Agustín", apellido: "Pereira", equipo: "Los Contadores", goles: 3 },
    { ci: "45678901", nombre: "Sofía", apellido: "Martínez", equipo: "Ingeniería FC", goles: 2 },
    { ci: "44556677", nombre: "Joaquín", apellido: "Núñez", equipo: "Derecho United", goles: 2 },
    { ci: "22334455", nombre: "Florencia", apellido: "Silva", equipo: "Los Contadores", goles: 1 },
  ],
  "fair-play": [
    { id_equipo: 4, equipo: "Derecho United", amarillas: 1, rojas: 0, puntaje: 1 },
    { id_equipo: 1, equipo: "Ingeniería FC", amarillas: 3, rojas: 0, puntaje: 3 },
    { id_equipo: 2, equipo: "Los Contadores", amarillas: 2, rojas: 1, puntaje: 5 },
  ],
  "promedio-goles": [
    { fecha: "1", partidos: 2, goles: 7, promedio: 3.5 },
    { fecha: "2", partidos: 2, goles: 5, promedio: 2.5 },
    { fecha: "3", partidos: 2, goles: 8, promedio: 4.0 },
    { fecha: "Total", partidos: 6, goles: 20, promedio: 3.33 },
  ],
  "canchas-turnos": [
    { complejo: "Complejo Central", cancha: "Cancha 1", turno: "20:00-21:00", partidos: 3 },
    { complejo: "Complejo Central", cancha: "Cancha 2", turno: "19:00-20:00", partidos: 2 },
    { complejo: "Fútbol Parque", cancha: "Cancha A", turno: "21:00-22:00", partidos: 1 },
  ],
  "jugadores-facultad-tipo": [
    { facultad: "Ingeniería y Tecnologías", tipo: "grado", cantidad: 4 },
    { facultad: "Ingeniería y Tecnologías", tipo: "posgrado", cantidad: 1 },
    { facultad: "Ingeniería y Tecnologías", tipo: "docente", cantidad: 2 },
    { facultad: "Ingeniería y Tecnologías", tipo: "funcionario", cantidad: 1 },
    { facultad: "Ciencias Empresariales", tipo: "grado", cantidad: 4 },
    { facultad: "Ciencias Empresariales", tipo: "posgrado", cantidad: 1 },
    { facultad: "Derecho", tipo: "grado", cantidad: 2 },
  ],
  "nunca-jugaron": [
    { ci: "67890123", nombre: "Camila", apellido: "López", equipo: "Ingeniería FC" },
    { ci: "55667788", nombre: "Micaela", apellido: "Ramos", equipo: "Derecho United" },
  ],
  "sanciones": [
    { equipo: "Ingeniería FC", motivo: "disciplinaria", cantidad: 1 },
    { equipo: "Ingeniería FC", motivo: "acumulacion_amarillas", cantidad: 1 },
    { equipo: "Los Contadores", motivo: "roja", cantidad: 1 },
  ],
  "estado-partidos": [
    { estado: "jugado", cantidad: 6, porcentaje: 75.0 },
    { estado: "postergado", cantidad: 1, porcentaje: 12.5 },
    { estado: "cancelado", cantidad: 1, porcentaje: 12.5 },
    { estado: "programado", cantidad: 0, porcentaje: 0.0 },
  ],
  "extra-1": [
    { equipo: "Ingeniería FC", pj_local: 2, pts_local: 6, gf_local: 6, gc_local: 1, pj_visitante: 1, pts_visitante: 1, gf_visitante: 2, gc_visitante: 2 },
    { equipo: "Los Contadores", pj_local: 1, pts_local: 0, gf_local: 1, gc_local: 3, pj_visitante: 2, pts_visitante: 4, gf_visitante: 4, gc_visitante: 2 },
  ],
  "extra-2": [
    { ci: "12345678", nombre: "Juan", apellido: "Pérez", equipo: "Ingeniería FC", partidos: 3, goles: 4 },
    { ci: "23456789", nombre: "Lucía", apellido: "Gómez", equipo: "Los Contadores", partidos: 3, goles: 0 },
    { ci: "45678901", nombre: "Sofía", apellido: "Martínez", equipo: "Ingeniería FC", partidos: 2, goles: 2 },
  ],
  "extra-3": [
    { equipo: "Ingeniería FC", mejor_racha: 3, racha_actual: 3 },
    { equipo: "Los Contadores", mejor_racha: 2, racha_actual: 0 },
    { equipo: "Derecho United", mejor_racha: 2, racha_actual: 1 },
  ],
};

export async function obtenerReporte(nombre, idTorneo, sinTorneo) {
  if (USAR_MOCK) {
    return datosPrueba[nombre] || [];
  }
  if (sinTorneo) {
    return pedir("/reportes/" + nombre);
  }
  return pedir("/reportes/" + nombre + "?torneo=" + idTorneo);
}