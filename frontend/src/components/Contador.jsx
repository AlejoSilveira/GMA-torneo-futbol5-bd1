import { useEffect, useState } from "react";

// muestra un número que sube desde 0 hasta el valor, rápido al principio y más lento al final
export default function Contador({ valor, duracion = 800 }) {
  const [mostrado, setMostrado] = useState(0);

  useEffect(() => {
    let inicio = null;
    let pedido;

    function paso(tiempo) {
      if (inicio === null) {
        inicio = tiempo;
      }
      const avance = Math.min((tiempo - inicio) / duracion, 1);
      const suavizado = 1 - Math.pow(1 - avance, 3);
      setMostrado(Math.round(valor * suavizado));
      if (avance < 1) {
        pedido = requestAnimationFrame(paso);
      }
    }

    pedido = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(pedido);
  }, [valor, duracion]);

  return <>{mostrado}</>;
}