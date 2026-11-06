import { createContext, useContext, useEffect, useState } from "react";

const ConfirmarContext = createContext(null);

export function ConfirmarProvider({ children }) {
  const [pedido, setPedido] = useState(null);

  // muestra la ventana y devuelve una promesa que se resuelve con true o false
  function confirmar(mensaje, opciones = {}) {
    return new Promise((resolver) => {
      setPedido({
        mensaje: mensaje,
        textoBoton: opciones.textoBoton || "Confirmar",
        peligro: opciones.peligro !== false,
        resolver: resolver,
      });
    });
  }

  function responder(valor) {
    pedido.resolver(valor);
    setPedido(null);
  }

  // la tecla Escape cancela
  useEffect(() => {
    if (pedido === null) {
      return;
    }
    function teclaApretada(e) {
      if (e.key === "Escape") {
        responder(false);
      }
    }
    window.addEventListener("keydown", teclaApretada);
    return () => window.removeEventListener("keydown", teclaApretada);
  }, [pedido]);

  return (
    <ConfirmarContext.Provider value={confirmar}>
      {children}

      {pedido !== null && (
        <div className="fondo-modal" onClick={() => responder(false)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            {pedido.peligro && <div className="tarjeta-roja"></div>}
            <p>{pedido.mensaje}</p>
            <div className="botones-modal">
              <button className="secundario" onClick={() => responder(false)}>
                Cancelar
              </button>
              <button
                className={pedido.peligro ? "boton-peligro" : ""}
                onClick={() => responder(true)}
                autoFocus
              >
                {pedido.textoBoton}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmarContext.Provider>
  );
}

export function useConfirmar() {
  return useContext(ConfirmarContext);
}