import { useEffect, useState } from "react";
import { listarTorneos, nombreTorneo } from "../api/torneos";
import { listarFacultades, listarJugadores } from "../api/jugadores";
import {
  listarEquipos,
  crearEquipo,
  editarEquipo,
  borrarEquipo,
  listarPlantel,
  agregarAlPlantel,
  cambiarCamiseta,
  quitarDelPlantel,
} from "../api/equipos";

const equipoVacio = { nombre: "", id_facultad: "" };
const jugadorVacio = { ci_jugador: "", numero_camiseta: "" };

const nombresEstado = {
  inscripcion: "Inscripción",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

export default function Equipos() {
  const [torneos, setTorneos] = useState([]);
  const [idTorneo, setIdTorneo] = useState(null);
  const [facultades, setFacultades] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [formEquipo, setFormEquipo] = useState(equipoVacio);

  const [equipoElegido, setEquipoElegido] = useState(null);
  const [plantel, setPlantel] = useState([]);
  const [formDatos, setFormDatos] = useState({ nombre: "", ci_capitan: "" });
  const [formJugador, setFormJugador] = useState(jugadorVacio);
  const [ciCambiando, setCiCambiando] = useState(null);
  const [numeroNuevo, setNumeroNuevo] = useState("");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarInicio() {
    try {
      const listaTorneos = await listarTorneos();
      setTorneos(listaTorneos);
      setFacultades(await listarFacultades());
      setJugadores(await listarJugadores());
      if (listaTorneos.length > 0) {
        setIdTorneo(listaTorneos[0].id_torneo);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarEquipos(id) {
    try {
      const lista = await listarEquipos(id);
      setEquipos(lista);
      return lista;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }

  async function cargarPlantel(idEquipo) {
    try {
      setPlantel(await listarPlantel(idEquipo));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarInicio();
  }, []);

  useEffect(() => {
    if (idTorneo !== null) {
      setEquipoElegido(null);
      limpiarMensajes();
      cargarEquipos(idTorneo);
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
  const enInscripcion = torneoActual && torneoActual.estado === "inscripcion";

  function nombreFacultad(id) {
    const facultad = facultades.find((f) => f.id_facultad === id);
    if (facultad) {
      return facultad.nombre;
    }
    return "-";
  }

  function nombreJugador(ci) {
    const jugador = jugadores.find((j) => j.ci === ci);
    if (jugador) {
      return jugador.nombre + " " + jugador.apellido;
    }
    return "Sin capitán";
  }

  function formatearDia(dia) {
    const partes = dia.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
  }

  // equipos

  function cambiarFormEquipo(e) {
    setFormEquipo({ ...formEquipo, [e.target.name]: e.target.value });
  }

  async function guardarEquipo(e) {
    e.preventDefault();
    limpiarMensajes();

    if (formEquipo.nombre.trim() === "" || formEquipo.id_facultad === "") {
      setError("Completá el nombre y la facultad del equipo");
      return;
    }

    try {
      await crearEquipo({
        nombre: formEquipo.nombre.trim(),
        id_torneo: idTorneo,
        id_facultad: Number(formEquipo.id_facultad),
      });
      setMensaje("Equipo creado. Ahora agregale jugadores desde Ver plantel");
      setFormEquipo(equipoVacio);
      cargarEquipos(idTorneo);
    } catch (err) {
      setError(err.message);
    }
  }

  async function borrarUnEquipo(equipo) {
    if (!window.confirm("¿Seguro que querés borrar " + equipo.nombre + "? Se borra también su plantel")) {
      return;
    }
    limpiarMensajes();
    try {
      await borrarEquipo(equipo.id_equipo);
      setMensaje("Equipo borrado");
      if (equipoElegido && equipoElegido.id_equipo === equipo.id_equipo) {
        setEquipoElegido(null);
      }
      cargarEquipos(idTorneo);
    } catch (err) {
      setError(err.message);
    }
  }

  function verPlantel(equipo) {
    limpiarMensajes();
    cancelarCambioNumero();
    if (equipoElegido && equipoElegido.id_equipo === equipo.id_equipo) {
      setEquipoElegido(null);
      return;
    }
    setEquipoElegido(equipo);
    setFormDatos({ nombre: equipo.nombre, ci_capitan: equipo.ci_capitan || "" });
    setFormJugador(jugadorVacio);
    cargarPlantel(equipo.id_equipo);
  }

  async function actualizarEquipoElegido() {
    const lista = await cargarEquipos(idTorneo);
    const actualizado = lista.find((e) => e.id_equipo === equipoElegido.id_equipo);
    if (actualizado) {
      setEquipoElegido({ ...actualizado });
      setFormDatos({ nombre: actualizado.nombre, ci_capitan: actualizado.ci_capitan || "" });
    }
  }

  // datos del equipo elegido

  function cambiarFormDatos(e) {
    setFormDatos({ ...formDatos, [e.target.name]: e.target.value });
  }

  async function guardarDatos(e) {
    e.preventDefault();
    limpiarMensajes();

    if (formDatos.nombre.trim() === "") {
      setError("El nombre del equipo no puede quedar vacío");
      return;
    }

    let capitan = null;
    if (formDatos.ci_capitan !== "") {
      capitan = formDatos.ci_capitan;
    }

    try {
      await editarEquipo(equipoElegido.id_equipo, {
        nombre: formDatos.nombre.trim(),
        ci_capitan: capitan,
      });
      setMensaje("Datos del equipo guardados");
      actualizarEquipoElegido();
    } catch (err) {
      setError(err.message);
    }
  }

  // plantel

  function cambiarFormJugador(e) {
    setFormJugador({ ...formJugador, [e.target.name]: e.target.value });
  }

  function numeroValido(numero) {
    return Number.isInteger(numero) && numero >= 1 && numero <= 99;
  }

  async function agregarJugador(e) {
    e.preventDefault();
    limpiarMensajes();

    if (formJugador.ci_jugador === "" || formJugador.numero_camiseta === "") {
      setError("Elegí un jugador y su número de camiseta");
      return;
    }
    const numero = Number(formJugador.numero_camiseta);
    if (!numeroValido(numero)) {
      setError("El número de camiseta tiene que ser un entero entre 1 y 99");
      return;
    }

    try {
      await agregarAlPlantel(equipoElegido.id_equipo, {
        ci_jugador: formJugador.ci_jugador,
        numero_camiseta: numero,
      });
      setMensaje("Jugador agregado al plantel");
      setFormJugador(jugadorVacio);
      cargarPlantel(equipoElegido.id_equipo);
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarCambioNumero(fila) {
    limpiarMensajes();
    setCiCambiando(fila.ci_jugador);
    setNumeroNuevo(String(fila.numero_camiseta));
  }

  function cancelarCambioNumero() {
    setCiCambiando(null);
    setNumeroNuevo("");
  }

  async function guardarCambioNumero(fila) {
    limpiarMensajes();
    const numero = Number(numeroNuevo);
    if (!numeroValido(numero)) {
      setError("El número de camiseta tiene que ser un entero entre 1 y 99");
      return;
    }
    try {
      await cambiarCamiseta(equipoElegido.id_equipo, fila.ci_jugador, numero);
      setMensaje("Número de camiseta cambiado");
      cancelarCambioNumero();
      cargarPlantel(equipoElegido.id_equipo);
    } catch (err) {
      setError(err.message);
    }
  }

  async function quitarJugador(fila) {
    if (!window.confirm("¿Quitar a " + fila.nombre + " " + fila.apellido + " del plantel?")) {
      return;
    }
    limpiarMensajes();
    try {
      await quitarDelPlantel(equipoElegido.id_equipo, fila.ci_jugador);
      setMensaje("Jugador quitado del plantel");
      cargarPlantel(equipoElegido.id_equipo);
      actualizarEquipoElegido();
    } catch (err) {
      setError(err.message);
    }
  }

  let jugadoresDisponibles = [];
  if (equipoElegido) {
    jugadoresDisponibles = jugadores.filter(
      (j) =>
        j.id_facultad === equipoElegido.id_facultad &&
        !plantel.some((p) => p.ci_jugador === j.ci)
    );
  }

  return (
    <div>
      <h1>Equipos y planteles</h1>

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

      {!enInscripcion && torneoActual && (
        <p className="aviso">
          Este torneo no está en etapa de inscripción, así que no se pueden crear equipos ni modificar planteles.
        </p>
      )}

      {enInscripcion && (
        <form className="formulario" onSubmit={guardarEquipo} noValidate>
          <h2>Nuevo equipo</h2>
          <label>
            Nombre
            <input name="nombre" value={formEquipo.nombre} onChange={cambiarFormEquipo} />
          </label>
          <label>
            Facultad
            <select name="id_facultad" value={formEquipo.id_facultad} onChange={cambiarFormEquipo}>
              <option value="">Elegí una facultad</option>
              {facultades.map((f) => (
                <option key={f.id_facultad} value={f.id_facultad}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="botones">
            <button type="submit">Crear equipo</button>
          </div>
        </form>
      )}

      <div className="tabla-scroll"><table>
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Facultad</th>
            <th>Capitán</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {equipos.length === 0 && (
            <tr>
              <td colSpan="4">Este torneo no tiene equipos</td>
            </tr>
          )}
          {equipos.map((eq) => (
            <tr key={eq.id_equipo}>
              <td>{eq.nombre}</td>
              <td>{nombreFacultad(eq.id_facultad)}</td>
              <td>{eq.ci_capitan ? nombreJugador(eq.ci_capitan) : "Sin capitán"}</td>
              <td>
                <button onClick={() => verPlantel(eq)}>
                  {equipoElegido && equipoElegido.id_equipo === eq.id_equipo
                    ? "Cerrar plantel"
                    : "Ver plantel"}
                </button>
                {enInscripcion && (
                  <button className="peligro" onClick={() => borrarUnEquipo(eq)}>
                    Borrar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      {equipoElegido && (
        <div className="seccion">
          <h2>
            {equipoElegido.nombre} · {nombreFacultad(equipoElegido.id_facultad)}
          </h2>

          {plantel.length < 5 && (
            <p className="aviso">
              El plantel tiene {plantel.length} jugadores. Necesita al menos 5 para que el equipo pueda jugar partidos.
            </p>
          )}

          <form className="formulario" onSubmit={guardarDatos} noValidate>
            <h2>Datos del equipo</h2>
            <label>
              Nombre
              <input name="nombre" value={formDatos.nombre} onChange={cambiarFormDatos} />
            </label>
            <label>
              Capitán
              <select name="ci_capitan" value={formDatos.ci_capitan} onChange={cambiarFormDatos}>
                <option value="">Sin capitán</option>
                {plantel.map((p) => (
                  <option key={p.ci_jugador} value={p.ci_jugador}>
                    {p.nombre} {p.apellido}
                  </option>
                ))}
              </select>
            </label>
            <div className="botones">
              <button type="submit">Guardar datos</button>
            </div>
          </form>

          {enInscripcion && (
            <form className="formulario" onSubmit={agregarJugador} noValidate>
              <h2>Agregar jugador al plantel</h2>
              <label>
                Jugador
                <select name="ci_jugador" value={formJugador.ci_jugador} onChange={cambiarFormJugador}>
                  <option value="">Elegí un jugador</option>
                  {jugadoresDisponibles.map((j) => (
                    <option key={j.ci} value={j.ci}>
                      {j.nombre} {j.apellido} ({j.tipo})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Número de camiseta
                <input
                  name="numero_camiseta"
                  type="number"
                  min="1"
                  max="99"
                  value={formJugador.numero_camiseta}
                  onChange={cambiarFormJugador}
                />
              </label>
              <div className="botones">
                <button type="submit">Agregar</button>
              </div>
            </form>
          )}

          <div className="tabla-scroll"><table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Jugador</th>
                <th>Cédula</th>
                <th>Tipo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plantel.length === 0 && (
                <tr>
                  <td colSpan="5">El plantel está vacío</td>
                </tr>
              )}
              {plantel.map((p) => (
                <tr key={p.ci_jugador}>
                  <td className="numero">
                    {ciCambiando === p.ci_jugador ? (
                      <input
                        className="input-numero"
                        type="number"
                        min="1"
                        max="99"
                        value={numeroNuevo}
                        onChange={(e) => setNumeroNuevo(e.target.value)}
                      />
                    ) : (
                      p.numero_camiseta
                    )}
                  </td>
                  <td>
                    {p.nombre} {p.apellido}
                    {equipoElegido.ci_capitan === p.ci_jugador && <span className="capitan">C</span>}
                  </td>
                  <td>{p.ci_jugador}</td>
                  <td>{p.tipo}</td>
                  <td>
                    {enInscripcion && ciCambiando === p.ci_jugador && (
                      <>
                        <button onClick={() => guardarCambioNumero(p)}>Guardar</button>
                        <button className="secundario" onClick={cancelarCambioNumero}>
                          Cancelar
                        </button>
                      </>
                    )}
                    {enInscripcion && ciCambiando !== p.ci_jugador && (
                      <>
                        <button onClick={() => empezarCambioNumero(p)}>Cambiar número</button>
                        <button className="peligro" onClick={() => quitarJugador(p)}>
                          Quitar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}