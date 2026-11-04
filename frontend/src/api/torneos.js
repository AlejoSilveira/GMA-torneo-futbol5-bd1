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

export async function listarTorneos() {
  if (USAR_MOCK) {
    return [...torneosPrueba];
  }
  return pedir("/torneos");
}