// pelota de fútbol clásica dibujada en SVG
export default function Pelota({ tamano = 40, className = "" }) {
  return (
    <svg className={className} width={tamano} height={tamano} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <clipPath id="borde-pelota">
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="47" fill="#ffffff" />
      <g clipPath="url(#borde-pelota)" fill="#1f2328">
        <polygon points="50,30 69,43.8 61.8,66.2 38.2,66.2 31,43.8" />
        <circle cx="77" cy="12.8" r="13" />
        <circle cx="93.7" cy="64.2" r="13" />
        <circle cx="50" cy="96" r="13" />
        <circle cx="6.3" cy="64.2" r="13" />
        <circle cx="23" cy="12.8" r="13" />
      </g>
      <g stroke="#1f2328" strokeWidth="3" strokeLinecap="round">
        <line x1="50" y1="30" x2="50" y2="14" />
        <line x1="69" y1="43.8" x2="84.2" y2="38.9" />
        <line x1="61.8" y1="66.2" x2="71.2" y2="79.1" />
        <line x1="38.2" y1="66.2" x2="28.8" y2="79.1" />
        <line x1="31" y1="43.8" x2="15.8" y2="38.9" />
      </g>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#1f2328" strokeWidth="3" />
    </svg>
  );
}