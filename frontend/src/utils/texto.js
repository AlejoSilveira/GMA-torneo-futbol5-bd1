// pasa a minúsculas y saca los tildes, así "perez" encuentra a "Pérez"
export function normalizar(texto) {
  return String(texto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}