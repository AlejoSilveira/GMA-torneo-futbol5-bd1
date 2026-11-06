import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Pelota from "./Pelota";
import Icono from "./Icono";

const menuAdmin = [
  { ruta: "/admin", texto: "Inicio", icono: "inicio" },
  { ruta: "/torneos", texto: "Torneos", icono: "torneos" },
  { ruta: "/jugadores", texto: "Jugadores", icono: "jugadores" },
  { ruta: "/equipos", texto: "Equipos", icono: "equipos" },
  { ruta: "/partidos", texto: "Partidos", icono: "partidos" },
  { ruta: "/planillas", texto: "Planillas", icono: "planillas" },
  { ruta: "/sanciones", texto: "Sanciones", icono: "sanciones" },
  { ruta: "/complejos", texto: "Complejos", icono: "complejos" },
  { ruta: "/reportes", texto: "Reportes", icono: "reportes" },
];

const menuPlanillero = [
  { ruta: "/planillas", texto: "Cargar planillas", icono: "planillas" },
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
        <strong className="marca">
          <Pelota tamano={26} className="pelota-marca" />
          Torneo Fútbol 5
        </strong>
        <nav>
          {menu.map((item) => (
            <NavLink key={item.ruta} to={item.ruta} end>
              <Icono nombre={item.icono} />
              {item.texto}
            </NavLink>
          ))}
        </nav>
        <span>{usuario.correo}</span>
        <button className="boton-salir" onClick={salir}>
          <Icono nombre="salir" tamano={16} />
          Salir
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}