import Pelota from "./Pelota";

// pelota que pica mientras se cargan los datos
export default function Cargando({ texto = "Cargando" }) {
  return (
    <div className="cargando">
      <div className="pelota-pica">
        <Pelota tamano={34} />
      </div>
      <div className="sombra-pelota"></div>
      <span>{texto}</span>
    </div>
  );
}