import { useEffect, useState } from "react";
import { listarTorneos, nombreTorneo } from "../api/torneos";
import { listarEquipos } from "../api/equipos";
import { listarComplejos, listarCanchas } from "../api/complejos";
import {
  listarTurnos,
  listarPartidos,
  crearPartido,
  editarPartido,
  borrarPartido,
  cambiarEstadoPartido,
} from "../api/partidos";

const partidoVacio = {
  numero_fecha: "",
  id_equipo_local: "",
  id_equipo_visitante: "",
  dia: "",
  id_turno: "",
  id_complejo: "",
  nombre_cancha: "",
};

const nombresEstado = {
  inscripcion: "Inscripción",
  en_curso: "En curso",
  finalizado: "Finalizado",
  programado: "Programado",
  jugado: "Jugado",
  postergado: "Postergado",
  cancelado: "Cancelado",
};

export default function Partidos() {
  const [torneos, setTorneos] = useState([]);
  const [idTorneo, setIdTorneo] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [complejos, setComplejos] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [partidos, setPartidos] = useState([]);

  const [form, setForm] = useState(partidoVacio);
  const [idEditando, setIdEditando] = useState(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarInicio() {
    try {
      const listaTorneos = await listarTorneos();
      setTorneos(listaTorneos);
      setTurnos(await listarTurnos());
      setComplejos(await listarComplejos());
      if (listaTorneos.length > 0) {
        setIdTorneo(listaTorneos[0].id_torneo);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarTorneo(id) {
    try {
      setEquipos(await listarEquipos(id));
      setPartidos(await listarPartidos(id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarPartidos() {
    try {
      setPartidos(await listarPartidos(idTorneo));
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarCanchas(idComplejo) {
    if (idComplejo === "") {
      setCanchas([]);
      return;
    }
    try {
      setCanchas(await listarCanchas(Number(idComplejo)));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarInicio();
  }, []);

  useEffect(() => {
    if (idTorneo !== null) {
      setError("");
      setMensaje("");
      cancelar();
      cargarTorneo(idTorneo);
    }
  }, [idTorneo]);

  useEffect(() => {
    if (error === "" && mensaje === "") {
      return;
    }
    const temporizador = setTimeout(() => {
      setError("");
      setMensaje("");
    }, 5000);
    return () => clearTimeout(temporizador);
  }, [error, mensaje]);

  function limpiarMensajes() {
    setError("");
    setMensaje("");
  }

  const torneoActual = torneos.find((t) => t.id_torneo === idTorneo);

  function nombreEquipo(id) {
    const equipo = equipos.find((e) => e.id_equipo === id);
    if (equipo) {
      return equipo.nombre;
    }
    return "-";
  }

  function nombreComplejo(id) {
    const complejo = complejos.find((c) => c.id_complejo === id);
    if (complejo) {
      return complejo.nombre;
    }
    return "-";
  }

  function horaTurno(id) {
    const turno = turnos.find((t) => t.id_turno === id);
    if (turno) {
      return turno.hora_inicio + " a " + turno.hora_fin;
    }
    return "-";
  }

  function formatearDia(dia) {
    const partes = dia.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
  }

  // formulario

  function cambiarForm(e) {
    if (e.target.name === "id_complejo") {
      setForm({ ...form, id_complejo: e.target.value, nombre_cancha: "" });
      cargarCanchas(e.target.value);
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  }

  function cancelar() {
    setForm(partidoVacio);
    setIdEditando(null);
    setCanchas([]);
  }

  function validar() {
    if (form.numero_fecha === "" || form.id_equipo_local === "" || form.id_equipo_visitante === "" ||
        form.dia === "" || form.id_turno === "" || form.id_complejo === "" || form.nombre_cancha === "") {
      return "Completá todos los datos del partido";
    }
    const numero = Number(form.numero_fecha);
    if (!Number.isInteger(numero) || numero < 1) {
      return "El número de fecha tiene que ser un entero mayor a 0";
    }
    if (form.id_equipo_local === form.id_equipo_visitante) {
      return "El equipo local y el visitante tienen que ser distintos";
    }
    if (torneoActual && (form.dia < torneoActual.fecha_inicio || form.dia > torneoActual.fecha_fin)) {
      return "El día tiene que estar dentro de las fechas del torneo";
    }
    return "";
  }

  async function guardar(e) {
    e.preventDefault();
    limpiarMensajes();

    const problema = validar();
    if (problema !== "") {
      setError(problema);
      return;
    }

    const partido = {
      id_torneo: idTorneo,
      numero_fecha: Number(form.numero_fecha),
      id_equipo_local: Number(form.id_equipo_local),
      id_equipo_visitante: Number(form.id_equipo_visitante),
      dia: form.dia,
      id_turno: Number(form.id_turno),
      nombre_cancha: form.nombre_cancha,
      id_complejo: Number(form.id_complejo),
    };

    try {
      if (idEditando) {
        await editarPartido(idEditando, partido);
        setMensaje("Partido reprogramado");
      } else {
        await crearPartido(partido);
        setMensaje("Partido programado");
      }
      cancelar();
      cargarPartidos();
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicion(p) {
    limpiarMensajes();
    setIdEditando(p.id_partido);
    setForm({
      numero_fecha: String(p.numero_fecha),
      id_equipo_local: String(p.id_equipo_local),
      id_equipo_visitante: String(p.id_equipo_visitante),
      dia: p.dia,
      id_turno: String(p.id_turno),
      id_complejo: String(p.id_complejo),
      nombre_cancha: p.nombre_cancha,
    });
    cargarCanchas(String(p.id_complejo));
    window.scrollTo(0, 0);
  }

  // acciones de la tabla

  async function cambiarEstado(p, nuevoEstado) {
    limpiarMensajes();
    try {
      await cambiarEstadoPartido(p.id_partido, nuevoEstado);
      setMensaje("El partido quedó " + nombresEstado[nuevoEstado].toLowerCase());
      cargarPartidos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function borrar(p) {
    const texto = nombreEquipo(p.id_equipo_local) + " vs " + nombreEquipo(p.id_equipo_visitante);
    if (!window.confirm("¿Seguro que querés eliminar el partido " + texto + "?")) {
      return;
    }
    limpiarMensajes();
    try {
      await borrarPartido(p.id_partido);
      setMensaje("Partido eliminado");
      cargarPartidos();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Partidos</h1>

      <div className="filtros">
        <label>
          Torneo
          <select
            value={idTorneo === null ? "" : idTorneo}
            onChange={(e) => setIdTorneo(Number(e.target.value))}
          >
            {torneos.map((t) => (
              <option key={t.id_torneo} value={t.id_torneo}>
                {nombreTorneo(t)}
              </option>
            ))}
          </select>
        </label>
        {torneoActual && (
          <span className={"estado estado-" + torneoActual.estado}>
            {nombresEstado[torneoActual.estado]}
          </span>
        )}
                {torneoActual && (
          <span className="rango-fechas">
            Del {formatearDia(torneoActual.fecha_inicio)} al {formatearDia(torneoActual.fecha_fin)}
          </span>
        )}
      </div>

      {error !== "" && <p className="error">{error}</p>}
      {mensaje !== "" && <p className="mensaje">{mensaje}</p>}

      <form className="formulario" onSubmit={guardar} noValidate>
        <h2>{idEditando ? "Reprogramar partido" : "Programar partido"}</h2>
        <label>
          Fecha del torneo
          <input
            name="numero_fecha"
            type="number"
            min="1"
            value={form.numero_fecha}
            onChange={cambiarForm}
          />
        </label>
        <label>
          Equipo local
          <select name="id_equipo_local" value={form.id_equipo_local} onChange={cambiarForm}>
            <option value="">Elegí un equipo</option>
            {equipos.map((e) => (
              <option key={e.id_equipo} value={e.id_equipo}>{e.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Equipo visitante
          <select name="id_equipo_visitante" value={form.id_equipo_visitante} onChange={cambiarForm}>
            <option value="">Elegí un equipo</option>
            {equipos
              .filter((e) => String(e.id_equipo) !== form.id_equipo_local)
              .map((e) => (
                <option key={e.id_equipo} value={e.id_equipo}>{e.nombre}</option>
              ))}
          </select>
        </label>
        <label>
          Día
          <input
            name="dia"
            type="date"
            value={form.dia}
            onChange={cambiarForm}
            min={torneoActual ? torneoActual.fecha_inicio : ""}
            max={torneoActual ? torneoActual.fecha_fin : ""}
          />
        </label>
        <label>
          Turno
          <select name="id_turno" value={form.id_turno} onChange={cambiarForm}>
            <option value="">Elegí un turno</option>
            {turnos.map((t) => (
              <option key={t.id_turno} value={t.id_turno}>
                {t.hora_inicio} a {t.hora_fin}
              </option>
            ))}
          </select>
        </label>
        <label>
          Complejo
          <select name="id_complejo" value={form.id_complejo} onChange={cambiarForm}>
            <option value="">Elegí un complejo</option>
            {complejos.map((c) => (
              <option key={c.id_complejo} value={c.id_complejo}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Cancha
          <select
            name="nombre_cancha"
            value={form.nombre_cancha}
            onChange={cambiarForm}
            disabled={form.id_complejo === ""}
          >
            <option value="">
              {form.id_complejo === "" ? "Primero elegí un complejo" : "Elegí una cancha"}
            </option>
            {canchas.map((c) => (
              <option key={c.nombre_cancha} value={c.nombre_cancha}>{c.nombre_cancha}</option>
            ))}
          </select>
        </label>
        <div className="botones">
          <button type="submit">{idEditando ? "Guardar cambios" : "Programar"}</button>
          {idEditando && (
            <button type="button" className="secundario" onClick={cancelar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="tabla-scroll"><table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Día</th>
            <th>Turno</th>
            <th>Cancha</th>
            <th className="derecha">Local</th>
            <th className="centro">Resultado</th>
            <th>Visitante</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {partidos.length === 0 && (
            <tr>
              <td colSpan="9">Este torneo no tiene partidos programados</td>
            </tr>
          )}
          {partidos.map((p) => (
            <tr key={p.id_partido} className={p.estado === "cancelado" ? "fila-cancelada" : ""}>
              <td className="numero">{p.numero_fecha}</td>
              <td>{formatearDia(p.dia)}</td>
              <td>{horaTurno(p.id_turno)}</td>
              <td>
                {p.nombre_cancha}
                <span className="detalle">{nombreComplejo(p.id_complejo)}</span>
              </td>
              <td className="derecha">{nombreEquipo(p.id_equipo_local)}</td>
              <td className="centro">
                {p.estado === "jugado" ? (
                  <span className="marcador">{p.goles_local} - {p.goles_visitante}</span>
                ) : (
                  <span className="vs">vs</span>
                )}
              </td>
              <td>{nombreEquipo(p.id_equipo_visitante)}</td>
              <td>
                {p.estado === "jugado" ? (
                  <span className="estado estado-jugado">Jugado</span>
                ) : (
                  <select
                    className={"select-estado estado-" + p.estado}
                    value={p.estado}
                    onChange={(e) => cambiarEstado(p, e.target.value)}
                  >
                    <option value="programado">Programado</option>
                    <option value="jugado">Jugado</option>
                    <option value="postergado">Postergado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                )}
              </td>
              <td>
                {p.estado !== "jugado" && (
                  <>
                    <button onClick={() => empezarEdicion(p)}>Reprogramar</button>
                    <button className="peligro" onClick={() => borrar(p)}>Eliminar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}