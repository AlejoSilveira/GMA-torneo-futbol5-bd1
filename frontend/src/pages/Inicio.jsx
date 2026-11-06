import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarTorneos, nombreTorneo, elegirTorneoActual } from "../api/torneos";
import { listarEquipos } from "../api/equipos";
import { listarPartidos, listarTurnos } from "../api/partidos";
import { listarSanciones } from "../api/sanciones";

const nombresEstado = {
  inscripcion: "Inscripción",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

const pasos = [
  { ruta: "/torneos", titulo: "Torneos", texto: "Crear la edición del semestre y pasarla de etapa." },
  { ruta: "/complejos", titulo: "Complejos", texto: "Cargar los complejos y sus canchas." },
  { ruta: "/jugadores", titulo: "Jugadores", texto: "Registrar a los jugadores de cada facultad." },
  { ruta: "/equipos", titulo: "Equipos", texto: "Crear los equipos y armar sus planteles durante la inscripción." },
  { ruta: "/partidos", titulo: "Partidos", texto: "Programar el fixture: fecha, día, turno y cancha." },
  { ruta: "/planillas", titulo: "Planillas", texto: "Después de cada partido, cargar quién jugó, los goles y las tarjetas." },
  { ruta: "/sanciones", titulo: "Sanciones", texto: "Ver las sanciones automáticas y cargar las disciplinarias." },
  { ruta: "/reportes", titulo: "Reportes", texto: "Consultar posiciones, goleadores y el resto de las estadísticas." },
];

export default function Inicio() {
  const [torneo, setTorneo] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [sanciones, setSanciones] = useState([]);
  const [error, setError] = useState("");

  async function cargarResumen() {
    try {
      const torneos = await listarTorneos();
      if (torneos.length === 0) {
        return;
      }
      const actual = elegirTorneoActual(torneos);
      setTorneo(actual);
      setTurnos(await listarTurnos());
      setEquipos(await listarEquipos(actual.id_torneo));
      setPartidos(await listarPartidos(actual.id_torneo));
      setSanciones(await listarSanciones(actual.id_torneo));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarResumen();
  }, []);

  function nombreEquipo(id) {
    const equipo = equipos.find((e) => e.id_equipo === id);
    if (equipo) {
      return equipo.nombre;
    }
    return "-";
  }

  function formatearDia(dia) {
    const partes = dia.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
  }

  function finDelPartido(p) {
    const turno = turnos.find((t) => t.id_turno === p.id_turno);
    if (!turno) {
      return null;
    }
    return new Date(p.dia + "T" + turno.hora_fin);
  }

  function horaTurno(id) {
    const turno = turnos.find((t) => t.id_turno === id);
    if (turno) {
      return turno.hora_inicio;
    }
    return "";
  }

  const ahora = new Date();

  const jugados = partidos.filter((p) => p.estado === "jugado");

  const pendientes = partidos.filter((p) => {
    const fin = finDelPartido(p);
    return p.estado === "programado" && fin !== null && fin <= ahora;
  });

  const proximos = partidos
    .filter((p) => {
      const fin = finDelPartido(p);
      return p.estado === "programado" && fin !== null && fin > ahora;
    })
    .slice(0, 5);

  return (
    <div>
      <h1>Inicio</h1>

      {error !== "" && <p className="error">{error}</p>}

      {torneo === null && (
        <p className="aviso">
          Todavía no hay torneos. Empezá creando uno en <Link to="/torneos">Torneos</Link>.
        </p>
      )}

      {torneo !== null && (
        <>
          <div className="torneo-actual">
            <div>
              <span className="detalle">Torneo actual</span>
              <h2>{nombreTorneo(torneo)}</h2>
              <span className="detalle">
                Del {formatearDia(torneo.fecha_inicio)} al {formatearDia(torneo.fecha_fin)}
              </span>
            </div>
            <span className={"estado estado-" + torneo.estado}>{nombresEstado[torneo.estado]}</span>
          </div>

          <div className="cifras">
            <div className="cifra">
              <span className="cifra-numero">{equipos.length}</span>
              <span className="cifra-texto">Equipos</span>
            </div>
            <div className="cifra">
              <span className="cifra-numero">
                {jugados.length}
                <small> / {partidos.filter((p) => p.estado !== "cancelado").length}</small>
              </span>
              <span className="cifra-texto">Partidos jugados</span>
            </div>
            <div className={"cifra" + (pendientes.length > 0 ? " cifra-alerta" : "")}>
              <span className="cifra-numero">{pendientes.length}</span>
              <span className="cifra-texto">Planillas pendientes</span>
            </div>
            <div className="cifra">
              <span className="cifra-numero">{sanciones.length}</span>
              <span className="cifra-texto">Sanciones</span>
            </div>
          </div>

          <div className="columnas">
            <div className="panel">
              <h3>Planillas pendientes</h3>
              {pendientes.length === 0 && <p className="detalle">No hay partidos esperando planilla.</p>}
              {pendientes.map((p) => (
                <div key={p.id_partido} className="fila-panel">
                  <span>
                    {nombreEquipo(p.id_equipo_local)} vs {nombreEquipo(p.id_equipo_visitante)}
                    <span className="detalle">
                      Fecha {p.numero_fecha} · {formatearDia(p.dia)}
                    </span>
                  </span>
                  <Link className="enlace-boton" to="/planillas">Cargar</Link>
                </div>
              ))}
            </div>

            <div className="panel">
              <h3>Próximos partidos</h3>
              {proximos.length === 0 && <p className="detalle">No hay partidos programados.</p>}
              {proximos.map((p) => (
                <div key={p.id_partido} className="fila-panel">
                  <span>
                    {nombreEquipo(p.id_equipo_local)} vs {nombreEquipo(p.id_equipo_visitante)}
                    <span className="detalle">
                      {formatearDia(p.dia)} · {horaTurno(p.id_turno)} · {p.nombre_cancha}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <h2 className="separado">Cómo organizar un torneo</h2>
      <div className="pasos">
        {pasos.map((paso, i) => (
          <Link key={paso.ruta} to={paso.ruta} className="paso">
            <span className="paso-numero">{i + 1}</span>
            <span>
              <strong>{paso.titulo}</strong>
              <span className="detalle">{paso.texto}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}