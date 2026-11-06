import { useEffect, useState } from "react";
import { listarTorneos, nombreTorneo, elegirTorneoActual } from "../api/torneos";
import { listarEquipos, listarPlantel } from "../api/equipos";
import { listarSanciones, crearSancion, editarSancion, borrarSancion } from "../api/sanciones";
import { normalizar } from "../utils/texto";

const formularioVacio = { ci_jugador: "", numero_fecha_inicio: "", cantidad_fechas: "1" };

const nombresMotivo = {
  roja: "Tarjeta roja",
  acumulacion_amarillas: "Acumulación de amarillas",
  disciplinaria: "Disciplinaria",
};

export default function Sanciones() {
  const [torneos, setTorneos] = useState([]);
  const [idTorneo, setIdTorneo] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [sanciones, setSanciones] = useState([]);

  const [form, setForm] = useState(formularioVacio);
  const [idEditando, setIdEditando] = useState(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("");

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

  // arma la lista de jugadores que están en algún equipo del torneo
  async function cargarJugadores(id) {
    try {
      const equipos = await listarEquipos(id);
      const lista = [];
      for (const equipo of equipos) {
        const plantel = await listarPlantel(equipo.id_equipo);
        for (const p of plantel) {
          lista.push({
            ci: p.ci_jugador,
            nombre: p.nombre + " " + p.apellido,
            equipo: equipo.nombre,
          });
        }
      }
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setJugadores(lista);
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarSanciones(id) {
    try {
      setSanciones(await listarSanciones(id));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarTorneos();
  }, []);

  useEffect(() => {
    if (idTorneo !== null) {
      setError("");
      setMensaje("");
      cancelar();
      cargarJugadores(idTorneo);
      cargarSanciones(idTorneo);
      setBusqueda("");
      setFiltroMotivo("");
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

  function datosJugador(ci) {
    const jugador = jugadores.find((j) => j.ci === ci);
    if (jugador) {
      return jugador;
    }
    return { nombre: ci, equipo: "-" };
  }

  // formulario

  function cambiarForm(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function cancelar() {
    setForm(formularioVacio);
    setIdEditando(null);
  }

  async function guardar(e) {
    e.preventDefault();
    limpiarMensajes();

    if (form.ci_jugador === "" || form.numero_fecha_inicio === "" || form.cantidad_fechas === "") {
      setError("Completá el jugador, la fecha de inicio y la cantidad de fechas");
      return;
    }
    const inicio = Number(form.numero_fecha_inicio);
    const cantidad = Number(form.cantidad_fechas);
    if (!Number.isInteger(inicio) || inicio < 1) {
      setError("La fecha de inicio tiene que ser un entero mayor a 0");
      return;
    }
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setError("La cantidad de fechas tiene que ser un entero mayor a 0");
      return;
    }

    try {
      if (idEditando) {
        await editarSancion(idEditando, {
          numero_fecha_inicio: inicio,
          cantidad_fechas: cantidad,
        });
        setMensaje("Sanción modificada");
      } else {
        await crearSancion({
          ci_jugador: form.ci_jugador,
          id_torneo: idTorneo,
          motivo: "disciplinaria",
          numero_fecha_inicio: inicio,
          cantidad_fechas: cantidad,
        });
        setMensaje("Sanción creada");
      }
      cancelar();
      cargarSanciones(idTorneo);
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicion(s) {
    limpiarMensajes();
    setIdEditando(s.id_sancion);
    setForm({
      ci_jugador: s.ci_jugador,
      numero_fecha_inicio: String(s.numero_fecha_inicio),
      cantidad_fechas: String(s.cantidad_fechas),
    });
    window.scrollTo(0, 0);
  }

  async function borrar(s) {
    const nombre = datosJugador(s.ci_jugador).nombre;
    if (!window.confirm("¿Seguro que querés borrar la sanción de " + nombre + "?")) {
      return;
    }
    limpiarMensajes();
    try {
      await borrarSancion(s.id_sancion);
      setMensaje("Sanción borrada");
      cargarSanciones(idTorneo);
    } catch (err) {
      setError(err.message);
    }
  }

  function textoFechas(s) {
    const ultima = s.numero_fecha_inicio + s.cantidad_fechas - 1;
    if (s.cantidad_fechas === 1) {
      return "Fecha " + s.numero_fecha_inicio;
    }
    return "Fechas " + s.numero_fecha_inicio + " a " + ultima;
  }

  const textoBusqueda = normalizar(busqueda.trim());

  const visibles = sanciones.filter((s) => {
    if (filtroMotivo !== "" && s.motivo !== filtroMotivo) {
      return false;
    }
    if (textoBusqueda === "") {
      return true;
    }
    const jugador = datosJugador(s.ci_jugador);
    const todo = normalizar(s.ci_jugador + " " + jugador.nombre + " " + jugador.equipo);
    return todo.includes(textoBusqueda);
  });

  const hayFiltros = busqueda !== "" || filtroMotivo !== "";

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroMotivo("");
  }

  return (
    <div>
      <h1>Sanciones</h1>

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

      <p className="aviso">
        Las sanciones por tarjeta roja y por acumulación de tres amarillas se generan solas al cargar las tarjetas en la
        planilla. Desde acá se cargan las sanciones disciplinarias.
      </p>

      <form className="formulario" onSubmit={guardar} noValidate>
        <h2>{idEditando ? "Modificar sanción" : "Nueva sanción disciplinaria"}</h2>
        <label>
          Jugador
          <select
            name="ci_jugador"
            value={form.ci_jugador}
            onChange={cambiarForm}
            disabled={idEditando !== null}
          >
            <option value="">
              {jugadores.length === 0 ? "Este torneo no tiene jugadores inscriptos" : "Elegí un jugador"}
            </option>
            {jugadores.map((j) => (
              <option key={j.ci} value={j.ci}>
                {j.nombre} ({j.equipo})
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde la fecha
          <input
            name="numero_fecha_inicio"
            type="number"
            min="1"
            value={form.numero_fecha_inicio}
            onChange={cambiarForm}
          />
        </label>
        <label>
          Cantidad de fechas
          <input
            name="cantidad_fechas"
            type="number"
            min="1"
            value={form.cantidad_fechas}
            onChange={cambiarForm}
          />
        </label>
        <div className="botones">
          <button type="submit">{idEditando ? "Guardar cambios" : "Crear sanción"}</button>
          {idEditando && (
            <button type="button" className="secundario" onClick={cancelar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="barra-busqueda">
        <input
          className="buscador"
          type="search"
          placeholder="Buscar por jugador, cédula o equipo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}>
          <option value="">Todos los motivos</option>
          <option value="roja">Tarjeta roja</option>
          <option value="acumulacion_amarillas">Acumulación de amarillas</option>
          <option value="disciplinaria">Disciplinaria</option>
        </select>
        <span className="contador">
          {visibles.length} de {sanciones.length} sanciones
          {hayFiltros && (
            <button type="button" className="limpiar" onClick={limpiarFiltros}>
              Limpiar
            </button>
          )}
        </span>
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Equipo</th>
              <th>Motivo</th>
              <th>Suspendido en</th>
              <th>Origen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan="6">
                  {hayFiltros ? "Ninguna sanción coincide con la búsqueda" : "No hay sanciones en este torneo"}
                </td>
              </tr>
            )}
            {visibles.map((s) => (
              <tr key={s.id_sancion}>
                <td>{datosJugador(s.ci_jugador).nombre}</td>
                <td>{datosJugador(s.ci_jugador).equipo}</td>
                <td>
                  <span className={"motivo motivo-" + s.motivo}></span>
                  {nombresMotivo[s.motivo]}
                </td>
                <td>{textoFechas(s)}</td>
                <td className="detalle-celda">
                  {s.motivo === "disciplinaria" ? "Manual" : "Automática"}
                </td>
                <td>
                  <button onClick={() => empezarEdicion(s)}>Editar</button>
                  <button className="peligro" onClick={() => borrar(s)}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}