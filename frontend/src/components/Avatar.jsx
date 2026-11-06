// círculo con las iniciales del jugador, con el color de su equipo
export default function Avatar({ nombre, apellido, color = "#5c6b7a", tamano = 28 }) {
  const iniciales = (String(nombre).charAt(0) + String(apellido).charAt(0)).toUpperCase();

  return (
    <span
      className="avatar"
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.42, backgroundColor: color }}
      aria-hidden="true"
    >
      {iniciales}
    </span>
  );
}