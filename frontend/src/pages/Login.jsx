import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Cancha from "../components/Cancha";
import Pelota from "../components/Pelota";

function esCorreoValido(correo) {
  return correo.includes("@") && correo.includes(".");
}

export default function Login() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");

    if (correo === "" || contrasena === "") {
      setError("Completá correo y contraseña");
      return;
    }
    if (!esCorreoValido(correo)) {
      setError("El correo no es válido");
      return;
    }

    setCargando(true);
    try {
      const rol = await iniciarSesion(correo, contrasena);
      if (rol === "administrador") {
        navigate("/admin");
      } else {
        navigate("/planillas");
      }
    } catch (err) {
      setError(err.message);
    }
    setCargando(false);
  }

  return (
    <div className="pantalla-login">
      <Cancha className="cancha-fondo" />

      <div className="pelota-rodando">
        <Pelota tamano={44} className="pelota-girando" />
      </div>

      <div className="login">
        <h1>Torneo Interfacultades</h1>
        <form onSubmit={manejarSubmit} noValidate>
          <label>
            Correo
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </label>
          {error !== "" && <p className="error">{error}</p>}
          <button type="submit" disabled={cargando}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}