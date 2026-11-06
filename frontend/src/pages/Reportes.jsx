import { useEffect, useState } from "react";
import { listarTorneos, nombreTorneo, elegirTorneoActual } from "../api/torneos";
import { obtenerReporte } from "../api/reportes";

const reportes = [
  {
    nombre: "posiciones",
    titulo: "Tabla de posiciones",
    descripcion: "Ordenada por puntos, después por diferencia de goles y después por goles a favor. Victoria 3 puntos, empate 1.",
    posicion: true,
    columnas: [
      { campo: "equipo", titulo: "Equipo" },
      { campo: "pj", titulo: "PJ" },
      { campo: "pg", titulo: "PG" },
      { campo: "pe", titulo: "PE" },
      { campo: "pp", titulo: "PP" },
      { campo: "gf", titulo: "GF" },
      { campo: "gc", titulo: "GC" },
      { campo: "dg", titulo: "DG" },
      { campo: "puntos", titulo: "Pts", destacado: true },
    ],
  },
  {
    nombre: "goleadores",
    titulo: "Goleadores",
    descripcion: "Los 10 jugadores con más goles en la edición. Los goles en contra no se cuentan.",
    posicion: true,
    barra: "goles",
    columnas: [
      { campo: "jugador", titulo: "Jugador", tipo: "jugador" },
      { campo: "equipo", titulo: "Equipo" },
      { campo: "goles", titulo: "Goles", destacado: true },
    ],
  },
  {
    nombre: "fair-play",
    titulo: "Fair play",
    descripcion: "1 punto por cada amarilla y 3 por cada roja. El mejor equipo es el de menor puntaje.",
    posicion: true,
    columnas: [
      { campo: "equipo", titulo: "Equipo" },
      { campo: "amarillas", titulo: "Amarillas" },
      { campo: "rojas", titulo: "Rojas" },
      { campo: "puntaje", titulo: "Puntaje", destacado: true },
    ],
  },
  {
    nombre: "promedio-goles",
    titulo: "Promedio de goles",
    descripcion: "Promedio de goles por partido en cada fecha y en toda la edición.",
    columnas: [
      { campo: "fecha", titulo: "Fecha", tipo: "fecha" },
      { campo: "partidos", titulo: "Partidos" },
      { campo: "goles", titulo: "Goles" },
      { campo: "promedio", titulo: "Promedio", tipo: "decimal", destacado: true },
    ],
  },
  {
    nombre: "canchas-turnos",
    titulo: "Canchas y turnos más usados",
    descripcion: "Cantidad de partidos por cancha y turno, de mayor a menor.",
    barra: "partidos",
    columnas: [
      { campo: "complejo", titulo: "Complejo" },
      { campo: "cancha", titulo: "Cancha" },
      { campo: "turno", titulo: "Turno" },
      { campo: "partidos", titulo: "Partidos", destacado: true },
    ],
  },
  {
    nombre: "jugadores-facultad-tipo",
    titulo: "Jugadores por facultad y tipo",
    descripcion: "Cantidad de jugadores registrados por facultad y tipo. No depende del torneo.",
    sinTorneo: true,
    barra: "cantidad",
    columnas: [
      { campo: "facultad", titulo: "Facultad" },
      { campo: "tipo", titulo: "Tipo", tipo: "texto" },
      { campo: "cantidad", titulo: "Cantidad", destacado: true },
    ],
  },
  {
    nombre: "nunca-jugaron",
    titulo: "Inscriptos que nunca jugaron",
    descripcion: "Jugadores de algún plantel que no figuran en ninguna planilla de la edición.",
    columnas: [
      { campo: "jugador", titulo: "Jugador", tipo: "jugador" },
      { campo: "ci", titulo: "Cédula" },
      { campo: "equipo", titulo: "Equipo" },
    ],
  },
  {
    nombre: "sanciones",
    titulo: "Sanciones por equipo y motivo",
    descripcion: "Cantidad de sanciones de los jugadores de cada equipo, separadas por motivo.",
    barra: "cantidad",
    columnas: [
      { campo: "equipo", titulo: "Equipo" },
      { campo: "motivo", titulo: "Motivo", tipo: "texto" },
      { campo: "cantidad", titulo: "Cantidad", destacado: true },
    ],
  },
  {
    nombre: "estado-partidos",
    titulo: "Estado de los partidos",
    descripcion: "Porcentaje de partidos jugados, postergados, cancelados y programados.",
    barra: "porcentaje",
    columnas: [
      { campo: "estado", titulo: "Estado", tipo: "texto" },
      { campo: "cantidad", titulo: "Partidos" },
      { campo: "porcentaje", titulo: "Porcentaje", tipo: "porcentaje", destacado: true },
    ],
  },
  {
    nombre: "extra-1",
    titulo: "Local vs. visitante",
    descripcion: "Rendimiento de cada equipo jugando de local y de visitante.",
    columnas: [
      { campo: "equipo", titulo: "Equipo" },
      { campo: "pj_local", titulo: "PJ local" },
      { campo: "pts_local", titulo: "Pts local", destacado: true },
      { campo: "gf_local", titulo: "GF local" },
      { campo: "gc_local", titulo: "GC local" },
      { campo: "pj_visitante", titulo: "PJ visit." },
      { campo: "pts_visitante", titulo: "Pts visit.", destacado: true },
      { campo: "gf_visitante", titulo: "GF visit." },
      { campo: "gc_visitante", titulo: "GC visit." },
    ],
  },
  {
    nombre: "extra-2",
    titulo: "Ranking de presencias",
    descripcion: "Jugadores con más partidos jugados en la edición, según las planillas.",
    posicion: true,
    barra: "partidos",
    columnas: [
      { campo: "jugador", titulo: "Jugador", tipo: "jugador" },
      { campo: "equipo", titulo: "Equipo" },
      { campo: "partidos", titulo: "Partidos", destacado: true },
      { campo: "goles", titulo: "Goles" },
    ],
  },
  {
    nombre: "extra-3",
    titulo: "Rachas sin perder",
    descripcion: "Mejor racha de partidos seguidos sin perder en la edición y racha actual de cada equipo.",
    barra: "mejor_racha",
    columnas: [
      { campo: "equipo", titulo: "Equipo" },
      { campo: "mejor_racha", titulo: "Mejor racha", destacado: true },
      { campo: "racha_actual", titulo: "Racha actual" },
    ],
  },
];

const textos = {
  grado: "Grado",
  posgrado: "Posgrado",
  docente: "Docente",
  funcionario: "Funcionario",
  roja: "Tarjeta roja",
  acumulacion_amarillas: "Acumulación de amarillas",
  disciplinaria: "Disciplinaria",
  jugado: "Jugado",
  postergado: "Postergado",
  cancelado: "Cancelado",
  programado: "Programado",
};

export default function Reportes() {
  const [torneos, setTorneos] = useState([]);
  const [idTorneo, setIdTorneo] = useState(null);
  const [elegido, setElegido] = useState(reportes[0]);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function cargarTorneos() {
    try {
      const lista = await listarTorneos();
      setTorneos(lista);
      if (lista.length > 0) {
        setIdTorneo(elegirTorneoActual(lista).id_torneo);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarReporte() {
    setError("");
    setCargando(true);
    try {
      setFilas(await obtenerReporte(elegido.nombre, idTorneo, elegido.sinTorneo));
    } catch (err) {
      setFilas([]);
      setError(err.message);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargarTorneos();
  }, []);

  useEffect(() => {
    if (idTorneo !== null) {
      cargarReporte();
    }
  }, [idTorneo, elegido]);

  // el valor más alto de la columna con barra, para calcular el largo de cada barra
  let maximo = 0;
  if (elegido.barra) {
    for (const f of filas) {
      if (Number(f[elegido.barra]) > maximo) {
        maximo = Number(f[elegido.barra]);
      }
    }
  }

  function valorCelda(fila, columna) {
    const valor = fila[columna.campo];
    if (columna.tipo === "jugador") {
      return fila.nombre + " " + fila.apellido;
    }
    if (columna.tipo === "decimal") {
      return Number(valor).toFixed(2);
    }
    if (columna.tipo === "porcentaje") {
      return Number(valor).toFixed(1) + " %";
    }
    if (columna.tipo === "texto") {
      return textos[valor] || valor;
    }
    if (columna.tipo === "fecha") {
      return valor === "Total" ? "Total" : "Fecha " + valor;
    }
    return valor;
  }

  function anchoBarra(fila) {
    if (maximo === 0) {
      return "0%";
    }
    return (Number(fila[elegido.barra]) / maximo) * 100 + "%";
  }

  return (
    <div>
      <h1>Reportes</h1>

      <div className="filtros">
        <label>
          Torneo
          <select
            value={idTorneo === null ? "" : idTorneo}
            onChange={(e) => setIdTorneo(Number(e.target.value))}
            disabled={elegido.sinTorneo}
          >
            {torneos.map((t) => (
              <option key={t.id_torneo} value={t.id_torneo}>
                {nombreTorneo(t)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="reportes">
        <nav className="lista-reportes">
          {reportes.map((r, i) => (
            <button
              key={r.nombre}
              className={r.nombre === elegido.nombre ? "activo" : ""}
              onClick={() => setElegido(r)}
            >
              <span className="indice">{String(i + 1).padStart(2, "0")}</span>
              {r.titulo}
            </button>
          ))}
        </nav>

        <div className="contenido-reporte">
          <h2>{elegido.titulo}</h2>
          <p className="detalle descripcion-reporte">{elegido.descripcion}</p>

          {error !== "" && <p className="error">{error}</p>}

          <div className="tabla-scroll"><table>
            <thead>
              <tr>
                {elegido.posicion && <th>#</th>}
                {elegido.columnas.map((c) => (
                  <th key={c.campo}>{c.titulo}</th>
                ))}
                {elegido.barra && <th className="columna-barra"></th>}
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={elegido.columnas.length + 2}>Cargando...</td>
                </tr>
              )}
              {!cargando && filas.length === 0 && (
                <tr>
                  <td colSpan={elegido.columnas.length + 2}>No hay datos para este reporte</td>
                </tr>
              )}
              {!cargando &&
                filas.map((f, i) => (
                  <tr key={i} className={f.fecha === "Total" ? "fila-total" : ""}>
                    {elegido.posicion && <td className="numero">{i + 1}</td>}
                    {elegido.columnas.map((c) => (
                      <td key={c.campo} className={c.destacado ? "destacado" : ""}>
                        {valorCelda(f, c)}
                      </td>
                    ))}
                    {elegido.barra && (
                      <td className="columna-barra">
                        <div className="barra">
                          <div className="barra-relleno" style={{ width: anchoBarra(f) }}></div>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}