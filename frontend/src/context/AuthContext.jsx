import { createContext, useContext, useState } from "react";
import { login as loginApi } from "../api/client";

const AuthContext = createContext(null);

function obtenerSesionGuardada() {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }
  return {
    token: token,
    rol: localStorage.getItem("rol"),
    correo: localStorage.getItem("correo"),
  };
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(obtenerSesionGuardada());

  async function iniciarSesion(correo, contrasena) {
    const resultado = await loginApi(correo, contrasena);

    localStorage.setItem("token", resultado.token);
    localStorage.setItem("rol", resultado.rol);
    localStorage.setItem("correo", correo);

    setUsuario({ token: resultado.token, rol: resultado.rol, correo: correo });
    return resultado.rol;
  }

  function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("correo");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}