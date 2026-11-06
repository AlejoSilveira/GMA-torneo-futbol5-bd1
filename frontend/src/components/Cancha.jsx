// líneas de una cancha vista desde arriba, en SVG
export default function Cancha({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="-30 -10 1110 700"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <g fill="none" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="4">
        {/* contorno y mitad de cancha */}
        <rect x="0" y="0" width="1050" height="680" />
        <line x1="525" y1="0" x2="525" y2="680" />
        <circle cx="525" cy="340" r="91.5" />

        {/* área, área chica, arco y medialuna de la izquierda */}
        <rect x="0" y="138.5" width="165" height="403" />
        <rect x="0" y="248.5" width="55" height="183" />
        <rect x="-20" y="303.4" width="20" height="73.2" />
        <path d="M165 266.9 A91.5 91.5 0 0 1 165 413.1" />

        {/* lo mismo de la derecha */}
        <rect x="885" y="138.5" width="165" height="403" />
        <rect x="995" y="248.5" width="55" height="183" />
        <rect x="1050" y="303.4" width="20" height="73.2" />
        <path d="M885 266.9 A91.5 91.5 0 0 0 885 413.1" />

        {/* córners */}
        <path d="M0 10 A10 10 0 0 0 10 0" />
        <path d="M1040 0 A10 10 0 0 0 1050 10" />
        <path d="M0 670 A10 10 0 0 1 10 680" />
        <path d="M1040 680 A10 10 0 0 1 1050 670" />
      </g>
      <g fill="rgba(255, 255, 255, 0.55)">
        <circle cx="525" cy="340" r="5" />
        <circle cx="110" cy="340" r="5" />
        <circle cx="940" cy="340" r="5" />
      </g>
    </svg>
  );
}