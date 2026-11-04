import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const menuAdmin = [
  { ruta: "/admin", texto: "Inicio" },
  { ruta: "/jugadores", texto: "Jugadores" },
  { ruta: "/equipos", texto: "Equipos" },
  { ruta: "/partidos", texto: "Partidos" },
  { ruta: "/complejos", texto: "Complejos" },
  { ruta: "/reportes", texto: "Reportes" },
];

const menuPlanillero = [
  { ruta: "/planillero", texto: "Partidos a cargar" },
];

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  let menu = menuPlanillero;
  if (usuario.rol === "administrador") {
    menu = menuAdmin;
  }

  function salir() {
    cerrarSesion();
    navigate("/");
  }

  return (
    <div>
      <header>
        <strong>Torneo Fútbol 5</strong>
        <nav>
          {menu.map((item) => (
            <NavLink key={item.ruta} to={item.ruta} end>
              {item.texto}
            </NavLink>
          ))}
        </nav>
        <span>{usuario.correo}</span>
        <button onClick={salir}>Salir</button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}