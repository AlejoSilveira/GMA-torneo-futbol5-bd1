import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Jugadores from "./pages/Jugadores";
import Complejos from "./pages/Complejos";
import Equipos from "./pages/Equipos";
import Partidos from "./pages/Partidos";
import Planilla from "./pages/Planilla";
import Reportes from "./pages/Reportes";
import Sanciones from "./pages/Sanciones";

function Admin() {
  return <h1>Panel administrador</h1>;
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
    return <Navigate to="/planillas" />;
  }

  return children;
}

function soloAdmin(pantalla) {
  return <RutaProtegida rolPermitido="administrador">{pantalla}</RutaProtegida>;
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
            <Route path="/admin" element={soloAdmin(<Admin />)} />
            <Route path="/jugadores" element={soloAdmin(<Jugadores />)} />
            <Route path="/equipos" element={soloAdmin(<Equipos />)} />
            <Route path="/partidos" element={soloAdmin(<Partidos />)} />
            <Route path="/complejos" element={soloAdmin(<Complejos />)} />
            <Route path="/sanciones" element={soloAdmin(<Sanciones />)} />
            <Route path="/reportes" element={soloAdmin(<Reportes />)} />
            <Route path="/planillas" element={<Planilla />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}