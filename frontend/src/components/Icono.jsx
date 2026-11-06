// íconos de línea para el menú, dibujados en SVG
const iconos = {
  inicio: (
    <>
      <path d="M3 11 L12 4 L21 11" />
      <path d="M5 10 V20 H19 V10" />
    </>
  ),
  torneos: (
    <>
      <path d="M8 4 H16 V9 A4 4 0 0 1 8 9 Z" />
      <path d="M8 6 H5 V7 A3 3 0 0 0 8 10" />
      <path d="M16 6 H19 V7 A3 3 0 0 1 16 10" />
      <path d="M12 13 V17 M9 17 H15 M8 20 H16" />
    </>
  ),
  jugadores: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20 C3 15 15 15 15 20" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14 C19 14 21 16 21 19" />
    </>
  ),
  equipos: <path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6 Z" />,
  partidos: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10 H21 M8 3 V7 M16 3 V7" />
    </>
  ),
  planillas: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 11 H15 M9 15 H13" />
    </>
  ),
  sanciones: (
    <>
      <rect x="5" y="3" width="10" height="14" rx="1.5" />
      <path d="M18 7 L19.5 18 L10 19.5" />
    </>
  ),
  complejos: (
    <>
      <path d="M12 21 C12 21 19 14.5 19 9.5 A7 7 0 0 0 5 9.5 C5 14.5 12 21 12 21 Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  reportes: <path d="M4 20 H20 M7 16 V11 M12 16 V6 M17 16 V9" />,
  salir: <path d="M14 4 H19 V20 H14 M10 8 L6 12 L10 16 M6 12 H15" />,
};

export default function Icono({ nombre, tamano = 18 }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconos[nombre]}
    </svg>
  );
}