import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Jugadores from "./pages/Jugadores";
import Complejos from "./pages/Complejos";
import Equipos from "./pages/Equipos";

function Admin() {
  return <h1>Panel administrador</h1>;
}

function Planillero() {
  return <h1>Panel planillero</h1>;
}

function Reportes() {
  return <h1>Reportes</h1>;
}

function RutaProtegida({ rolPermitido, children }) {
  const { usuario } = useAuth();

  if (usuario === null) {
    return <Navigate to="/" />;
  }

  if (rolPermitido && usuario.rol !== rolPermitido) {
    if (usuario.rol === "administrador") {
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/planillero" />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route
              path="/admin"
              element={
                <RutaProtegida rolPermitido="administrador">
                  <Admin />
                </RutaProtegida>
              }
            />
            <Route
              path="/reportes"
              element={
                <RutaProtegida rolPermitido="administrador">
                  <Reportes />
                </RutaProtegida>
              }
            />
            <Route
              path="/jugadores"
              element={
                <RutaProtegida rolPermitido="administrador">
                  <Jugadores />
                </RutaProtegida>
              }
            />
            <Route
              path="/complejos"
              element={
                <RutaProtegida rolPermitido="administrador">
                  <Complejos />
                </RutaProtegida>
              }
            />
            <Route
              path="/equipos"
              element={
                <RutaProtegida rolPermitido="administrador">
                  <Equipos />
                </RutaProtegida>
              }
            />
            <Route
              path="/planillero"
              element={
                <RutaProtegida rolPermitido="planillero">
                  <Planillero />
                </RutaProtegida>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}