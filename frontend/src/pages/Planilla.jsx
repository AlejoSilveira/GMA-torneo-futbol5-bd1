import { useEffect, useState } from "react";
import { listarTorneos, nombreTorneo, elegirTorneoActual } from "../api/torneos";
import { listarEquipos, listarPlantel } from "../api/equipos";
import { listarTurnos, listarPartidos, obtenerPartido, cambiarEstadoPartido } from "../api/partidos";
import { listarSanciones, estaSuspendido } from "../api/sanciones";
import {
  listarPlanilla,
  agregarAPlanilla,
  quitarDePlanilla,
  listarGoles,
  agregarGol,
  borrarGol,
  listarTarjetas,
  agregarTarjeta,
  borrarTarjeta,
} from "../api/planillas";
import Escudo, { colorEquipo } from "../components/Escudo";
import Avatar from "../components/Avatar";

const golVacio = { ci_jugador: "", minuto: "", autogol: false };
const tarjetaVacia = { ci_jugador: "", minuto: "", color: "amarilla" };

export default function Planilla() {
  const [torneos, setTorneos] = useState([]);
  const [idTorneo, setIdTorneo] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [partidos, setPartidos] = useState([]);

  const [partido, setPartido] = useState(null);
  const [plantelLocal, setPlantelLocal] = useState([]);
  const [plantelVisitante, setPlantelVisitante] = useState([]);
  const [planilla, setPlanilla] = useState([]);
  const [goles, setGoles] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [sanciones, setSanciones] = useState([]);

  const [formGol, setFormGol] = useState(golVacio);
  const [formTarjeta, setFormTarjeta] = useState(tarjetaVacia);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarInicio() {
    try {
      const listaTorneos = await listarTorneos();
      setTorneos(listaTorneos);
      setTurnos(await listarTurnos());
      if (listaTorneos.length > 0) {
        setIdTorneo(elegirTorneoActual(listaTorneos).id_torneo);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarPartidos(id) {
    try {
      setEquipos(await listarEquipos(id));
      const lista = await listarPartidos(id);
      setPartidos(lista.filter((p) => p.estado !== "cancelado"));
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarPlanilla(idPartido) {
    try {
      const datos = await obtenerPartido(idPartido);
      setPartido(datos);
      setPlantelLocal(await listarPlantel(datos.id_equipo_local));
      setPlantelVisitante(await listarPlantel(datos.id_equipo_visitante));
      setPlanilla(await listarPlanilla(idPartido));
      setGoles(await listarGoles(idPartido));
      setTarjetas(await listarTarjetas(idPartido));
    } catch (err) {
      setError(err.message);
    }
    // el planillero puede no tener permiso para ver sanciones;
    // en ese caso igual funciona, porque el backend rechaza a los suspendidos
    try {
      setSanciones(await listarSanciones(idTorneo));
    } catch {
      setSanciones([]);
    }
  }

  useEffect(() => {
    cargarInicio();
  }, []);

  useEffect(() => {
    if (idTorneo !== null) {
      setError("");
      setMensaje("");
      setPartido(null);
      cargarPartidos(idTorneo);
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

  // ayudas

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

  function yaTermino(p) {
    const fin = finDelPartido(p);
    return fin !== null && fin <= new Date();
  }

  function sePuedeEditar(p) {
    if (p.estado === "postergado" || p.estado === "cancelado" || !yaTermino(p)) {
      return false;
    }
    if (p.estado === "jugado") {
      const limite = new Date(finDelPartido(p).getTime() + 48 * 60 * 60 * 1000);
      return new Date() <= limite;
    }
    return true;
  }

  const todosLosJugadores = [...plantelLocal, ...plantelVisitante];

  function nombreJugador(ci) {
    const jugador = todosLosJugadores.find((j) => j.ci_jugador === ci);
    if (jugador) {
      return jugador.nombre + " " + jugador.apellido;
    }
    return ci;
  }

  function equipoDelJugador(ci) {
    const fila = planilla.find((f) => f.ci_jugador === ci);
    if (fila) {
      return nombreEquipo(fila.id_equipo);
    }
    return "";
  }

  function estaEnPlanilla(ci) {
    return planilla.some((f) => f.ci_jugador === ci);
  }

  // abrir y cerrar

  function abrirPlanilla(p) {
    limpiarMensajes();
    setFormGol(golVacio);
    setFormTarjeta(tarjetaVacia);
    if (partido && partido.id_partido === p.id_partido) {
      setPartido(null);
      return;
    }
    cargarPlanilla(p.id_partido);
  }

  async function recargar() {
    await cargarPlanilla(partido.id_partido);
    cargarPartidos(idTorneo);
  }

  // planilla

  async function cambiarParticipacion(jugador, idEquipo) {
    limpiarMensajes();
    try {
      if (estaEnPlanilla(jugador.ci_jugador)) {
        await quitarDePlanilla(partido.id_partido, jugador.ci_jugador);
      } else {
        await agregarAPlanilla(partido.id_partido, {
          ci_jugador: jugador.ci_jugador,
          id_equipo: idEquipo,
        });
      }
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  // goles

  function cambiarFormGol(e) {
    if (e.target.name === "autogol") {
      setFormGol({ ...formGol, autogol: e.target.checked });
    } else {
      setFormGol({ ...formGol, [e.target.name]: e.target.value });
    }
  }

  async function guardarGol(e) {
    e.preventDefault();
    limpiarMensajes();
    if (formGol.ci_jugador === "" || formGol.minuto === "") {
      setError("Elegí el jugador y el minuto del gol");
      return;
    }
    const minuto = Number(formGol.minuto);
    if (!Number.isInteger(minuto) || minuto < 0 || minuto > 60) {
      setError("El minuto tiene que ser un entero entre 0 y 60");
      return;
    }
    try {
      await agregarGol(partido.id_partido, {
        ci_jugador: formGol.ci_jugador,
        minuto: minuto,
        autogol: formGol.autogol,
      });
      setMensaje("Gol cargado");
      setFormGol(golVacio);
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function quitarGol(gol) {
    limpiarMensajes();
    try {
      await borrarGol(partido.id_partido, gol.id_gol);
      setMensaje("Gol borrado");
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  // tarjetas

  function cambiarFormTarjeta(e) {
    setFormTarjeta({ ...formTarjeta, [e.target.name]: e.target.value });
  }

  async function guardarTarjeta(e) {
    e.preventDefault();
    limpiarMensajes();
    if (formTarjeta.ci_jugador === "" || formTarjeta.minuto === "") {
      setError("Elegí el jugador y el minuto de la tarjeta");
      return;
    }
    const minuto = Number(formTarjeta.minuto);
    if (!Number.isInteger(minuto) || minuto < 0 || minuto > 60) {
      setError("El minuto tiene que ser un entero entre 0 y 60");
      return;
    }
    try {
      await agregarTarjeta(partido.id_partido, {
        ci_jugador: formTarjeta.ci_jugador,
        minuto: minuto,
        color: formTarjeta.color,
      });
      setMensaje("Tarjeta cargada");
      setFormTarjeta(tarjetaVacia);
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function quitarTarjeta(tarjeta) {
    limpiarMensajes();
    try {
      await borrarTarjeta(partido.id_partido, tarjeta.id_tarjeta);
      setMensaje("Tarjeta borrada");
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  // estado

  async function marcarJugado() {
    limpiarMensajes();
    try {
      await cambiarEstadoPartido(partido.id_partido, "jugado");
      setMensaje("Partido marcado como jugado. Se puede corregir durante 48 horas");
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  // columna de un equipo con su plantel

  function columnaEquipo(idEquipo, plantel, editable) {
    return (
      <div className="columna-equipo">
        <h3 className="con-escudo">
          <Escudo id={idEquipo} nombre={nombreEquipo(idEquipo)} tamano={22} />
          {nombreEquipo(idEquipo)}
        </h3>
        {plantel.map((j) => {
          const suspendido = partido && estaSuspendido(sanciones, j.ci_jugador, partido.numero_fecha);
          return (
            <label
              key={j.ci_jugador}
              className={"jugador-planilla" + (suspendido ? " suspendido" : "")}
            >
              <input
                type="checkbox"
                checked={estaEnPlanilla(j.ci_jugador)}
                disabled={!editable || suspendido}
                onChange={() => cambiarParticipacion(j, idEquipo)}
              />
              <span className="camiseta">{j.numero_camiseta}</span>
              <Avatar nombre={j.nombre} apellido={j.apellido} color={colorEquipo(idEquipo)} tamano={24} />
              {j.nombre} {j.apellido}
              {suspendido && <span className="etiqueta-suspendido">Suspendido</span>}
            </label>
          );
        })}
      </div>
    );
  }

  const editable = partido ? sePuedeEditar(partido) : false;

  return (
    <div>
      <h1>Planillas de partidos</h1>

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
      </div>

      {error !== "" && <p className="error">{error}</p>}
      {mensaje !== "" && <p className="mensaje">{mensaje}</p>}

      <div className="tabla-scroll"><table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Día</th>
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
              <td colSpan="7">Este torneo no tiene partidos</td>
            </tr>
          )}
          {partidos.map((p) => (
            <tr key={p.id_partido}>
              <td className="numero">{p.numero_fecha}</td>
              <td>{formatearDia(p.dia)}</td>
              <td className="derecha">
                <span className="con-escudo">
                  {nombreEquipo(p.id_equipo_local)}
                  <Escudo id={p.id_equipo_local} nombre={nombreEquipo(p.id_equipo_local)} tamano={22} />
                </span>
              </td>
              <td className="centro">
                {p.estado === "jugado" ? (
                  <span className="marcador">{p.goles_local} - {p.goles_visitante}</span>
                ) : (
                  <span className="vs">vs</span>
                )}
              </td>
              <td>
                <span className="con-escudo">
                  <Escudo id={p.id_equipo_visitante} nombre={nombreEquipo(p.id_equipo_visitante)} tamano={22} />
                  {nombreEquipo(p.id_equipo_visitante)}
                </span>
              </td>
              <td>
                <span className={"estado estado-" + p.estado}>{p.estado}</span>
              </td>
              <td>
                {yaTermino(p) && p.estado !== "postergado" ? (
                  <button onClick={() => abrirPlanilla(p)}>
                    {partido && partido.id_partido === p.id_partido ? "Cerrar planilla" : "Abrir planilla"}
                  </button>
                ) : (
                  <span className="detalle">
                    {p.estado === "postergado" ? "Postergado" : "Todavía no se jugó"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      {partido && (
        <div className="seccion">
          <div className="encabezado-partido">
            <span className="equipo-grande derecha">
              {nombreEquipo(partido.id_equipo_local)}
              <Escudo id={partido.id_equipo_local} nombre={nombreEquipo(partido.id_equipo_local)} tamano={40} />
            </span>
            <span className="marcador marcador-grande">
              {partido.goles_local} - {partido.goles_visitante}
            </span>
            <span className="equipo-grande">
              <Escudo id={partido.id_equipo_visitante} nombre={nombreEquipo(partido.id_equipo_visitante)} tamano={40} />
              {nombreEquipo(partido.id_equipo_visitante)}
            </span>
          </div>
          <p className="detalle centro">
            Fecha {partido.numero_fecha} · {formatearDia(partido.dia)} · {partido.nombre_cancha}
          </p>

          {!editable && (
            <p className="aviso">
              Pasaron más de 48 horas desde el partido, así que la planilla ya no se puede modificar.
            </p>
          )}

          <h2>1. Jugadores que participaron</h2>
          <div className="columnas">
            {columnaEquipo(partido.id_equipo_local, plantelLocal, editable)}
            {columnaEquipo(partido.id_equipo_visitante, plantelVisitante, editable)}
          </div>

          <h2>2. Goles</h2>
          {editable && (
            <form className="formulario" onSubmit={guardarGol} noValidate>
              <label>
                Jugador
                <select name="ci_jugador" value={formGol.ci_jugador} onChange={cambiarFormGol}>
                  <option value="">
                    {planilla.length === 0 ? "Primero marcá quién jugó" : "Elegí un jugador"}
                  </option>
                  {planilla.map((f) => (
                    <option key={f.ci_jugador} value={f.ci_jugador}>
                      {nombreJugador(f.ci_jugador)} ({nombreEquipo(f.id_equipo)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Minuto
                <input name="minuto" type="number" min="0" max="60" value={formGol.minuto} onChange={cambiarFormGol} />
              </label>
              <label className="check">
                <input type="checkbox" name="autogol" checked={formGol.autogol} onChange={cambiarFormGol} />
                En contra (autogol)
              </label>
              <div className="botones">
                <button type="submit">Cargar gol</button>
              </div>
            </form>
          )}
          <div className="tabla-scroll"><table>
            <thead>
              <tr>
                <th>Min.</th>
                <th>Jugador</th>
                <th>Equipo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {goles.length === 0 && (
                <tr>
                  <td colSpan="4">No hay goles cargados</td>
                </tr>
              )}
              {goles.map((g) => (
                <tr key={g.id_gol}>
                  <td className="numero">{g.minuto}'</td>
                  <td>
                    {nombreJugador(g.ci_jugador)}
                    {g.autogol && <span className="etiqueta-autogol">En contra</span>}
                  </td>
                  <td>{equipoDelJugador(g.ci_jugador)}</td>
                  <td>
                    {editable && (
                      <button className="peligro" onClick={() => quitarGol(g)}>Borrar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>

          <h2 className="separado">3. Tarjetas</h2>
          {editable && (
            <form className="formulario" onSubmit={guardarTarjeta} noValidate>
              <label>
                Jugador
                <select name="ci_jugador" value={formTarjeta.ci_jugador} onChange={cambiarFormTarjeta}>
                  <option value="">
                    {planilla.length === 0 ? "Primero marcá quién jugó" : "Elegí un jugador"}
                  </option>
                  {planilla.map((f) => (
                    <option key={f.ci_jugador} value={f.ci_jugador}>
                      {nombreJugador(f.ci_jugador)} ({nombreEquipo(f.id_equipo)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Minuto
                <input name="minuto" type="number" min="0" max="60" value={formTarjeta.minuto} onChange={cambiarFormTarjeta} />
              </label>
              <label>
                Color
                <select name="color" value={formTarjeta.color} onChange={cambiarFormTarjeta}>
                  <option value="amarilla">Amarilla</option>
                  <option value="roja">Roja</option>
                </select>
              </label>
              <div className="botones">
                <button type="submit">Cargar tarjeta</button>
              </div>
            </form>
          )}
          <div className="tabla-scroll"><table>
            <thead>
              <tr>
                <th>Min.</th>
                <th>Jugador</th>
                <th>Equipo</th>
                <th>Tarjeta</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tarjetas.length === 0 && (
                <tr>
                  <td colSpan="5">No hay tarjetas cargadas</td>
                </tr>
              )}
              {tarjetas.map((t) => (
                <tr key={t.id_tarjeta}>
                  <td className="numero">{t.minuto}'</td>
                  <td>{nombreJugador(t.ci_jugador)}</td>
                  <td>{equipoDelJugador(t.ci_jugador)}</td>
                  <td>
                    <span className={"tarjeta tarjeta-" + t.color}></span>
                    {t.color === "roja" ? "Roja" : "Amarilla"}
                  </td>
                  <td>
                    {editable && (
                      <button className="peligro" onClick={() => quitarTarjeta(t)}>Borrar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>

          {partido.estado === "programado" && editable && (
            <div className="cierre-planilla">
              <p>Cuando termines de cargar todo, marcá el partido como jugado.</p>
              <button onClick={marcarJugado}>Marcar como jugado</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}