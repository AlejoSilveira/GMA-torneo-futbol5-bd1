// escudo generado a partir del equipo: iniciales, color y diseño según su id
const colores = ["#0b2545", "#2b8a3e", "#c92a2a", "#5f3dc4", "#e67700", "#0b7285", "#862e9c", "#495057"];

// el color de un equipo, para usarlo también en otros lugares
export function colorEquipo(id) {
  return colores[id % colores.length];
}

function iniciales(nombre) {
  const palabras = nombre.trim().split(" ").filter((p) => p !== "");
  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase();
  }
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

export default function Escudo({ id, nombre, tamano = 28 }) {
  const color = colorEquipo(id);
  const diseno = id % 3;
  const recorte = "escudo-" + id;

  return (
    <svg className="escudo" width={tamano} height={tamano * 1.2} viewBox="0 0 40 48" aria-hidden="true">
      <defs>
        <clipPath id={recorte}>
          <path d="M20 2 L37 8 V24 C37 35 29 42 20 46 C11 42 3 35 3 24 V8 Z" />
        </clipPath>
      </defs>
      <g clipPath={"url(#" + recorte + ")"}>
        <rect x="0" y="0" width="40" height="48" fill={color} />
        {diseno === 0 && <rect x="15" y="0" width="10" height="48" fill="rgba(255, 255, 255, 0.22)" />}
        {diseno === 1 && <rect x="0" y="18" width="40" height="10" fill="rgba(255, 255, 255, 0.22)" />}
        {diseno === 2 && <polygon points="0,30 40,10 40,20 0,40" fill="rgba(255, 255, 255, 0.22)" />}
      </g>
      <path
        d="M20 2 L37 8 V24 C37 35 29 42 20 46 C11 42 3 35 3 24 V8 Z"
        fill="none"
        stroke="rgba(0, 0, 0, 0.25)"
        strokeWidth="1.5"
      />
      <text
        x="20"
        y="28"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="Barlow Condensed, Arial, sans-serif"
        fontWeight="700"
        fontSize="15"
      >
        {iniciales(nombre)}
      </text>
    </svg>
  );
}