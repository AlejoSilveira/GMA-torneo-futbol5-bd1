import { useEffect, useState } from "react";
import {
  listarJugadores,
  listarFacultades,
  crearJugador,
  editarJugador,
  borrarJugador,
} from "../api/jugadores";
import { normalizar } from "../utils/texto";
import Avatar from "../components/Avatar";
import { colorEquipo } from "../components/Escudo";
import { listarTorneos, elegirTorneoActual } from "../api/torneos";
import { listarEquipos, listarPlantel } from "../api/equipos";
import { useConfirmar } from "../context/ConfirmarContext";

const formularioVacio = {
  ci: "",
  nombre: "",
  apellido: "",
  email: "",
  fecha_nacimiento: "",
  id_facultad: "",
  tipo: "grado",
};

const nombresTipo = {
  grado: "Grado",
  posgrado: "Posgrado",
  docente: "Docente",
  funcionario: "Funcionario",
};

function validarJugador(j) {
  if (j.ci === "" || j.nombre === "" || j.apellido === "" || j.email === "" ||
      j.fecha_nacimiento === "" || j.id_facultad === "") {
    return "Completá todos los campos";
  }
  if (!/^[0-9]{7,8}$/.test(j.ci)) {
    return "La cédula tiene que tener 7 u 8 números, sin puntos ni guión";
  }
  if (!j.email.includes("@") || !j.email.includes(".")) {
    return "El email no es válido";
  }
  const hoy = new Date().toISOString().slice(0, 10);
  if (j.fecha_nacimiento > hoy) {
    return "La fecha de nacimiento no puede ser futura";
  }
  return "";
}

export default function Jugadores() {
  const confirmar = useConfirmar();
  const [jugadores, setJugadores] = useState([]);
  const [facultades, setFacultades] = useState([]);
  const [form, setForm] = useState(formularioVacio);
  const [ciEditando, setCiEditando] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroFacultad, setFiltroFacultad] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [orden, setOrden] = useState({ campo: "apellido", ascendente: true });
  const [equipoDeJugador, setEquipoDeJugador] = useState({});

  // arma un mapa cédula -> equipo con los planteles del torneo actual
  async function cargarEquiposDeJugadores() {
    const torneos = await listarTorneos();
    if (torneos.length === 0) {
      return;
    }
    const actual = elegirTorneoActual(torneos);
    const equipos = await listarEquipos(actual.id_torneo);
    const mapa = {};
    for (const equipo of equipos) {
      const plantel = await listarPlantel(equipo.id_equipo);
      for (const p of plantel) {
        mapa[p.ci_jugador] = equipo.id_equipo;
      }
    }
    setEquipoDeJugador(mapa);
  }

  async function cargarDatos() {
    try {
      setJugadores(await listarJugadores());
      setFacultades(await listarFacultades());
      await cargarEquiposDeJugadores();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

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

  function manejarCambio(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function cancelar() {
    setForm(formularioVacio);
    setCiEditando(null);
  }

  async function guardar(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    const problema = validarJugador(form);
    if (problema !== "") {
      setError(problema);
      return;
    }

    const jugador = { ...form, id_facultad: Number(form.id_facultad) };

    try {
      if (ciEditando) {
        await editarJugador(ciEditando, jugador);
        setMensaje("Jugador modificado");
      } else {
        await crearJugador(jugador);
        setMensaje("Jugador creado");
      }
      cancelar();
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicion(jugador) {
    setForm({ ...jugador, id_facultad: String(jugador.id_facultad) });
    setCiEditando(jugador.ci);
    setError("");
    setMensaje("");
    window.scrollTo(0, 0);
  }

  async function borrar(ci) {
    if (!await confirmar("¿Seguro que querés borrar este jugador?")) {
      return;
    }
    setError("");
    setMensaje("");
    try {
      await borrarJugador(ci);
      setMensaje("Jugador borrado");
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  function nombreFacultad(id) {
    const facultad = facultades.find((f) => f.id_facultad === id);
    if (facultad) {
      return facultad.nombre;
    }
    return "-";
  }

  // buscar, filtrar y ordenar

  function cambiarOrden(campo) {
    if (orden.campo === campo) {
      setOrden({ campo: campo, ascendente: !orden.ascendente });
    } else {
      setOrden({ campo: campo, ascendente: true });
    }
  }

  function flecha(campo) {
    if (orden.campo !== campo) {
      return "";
    }
    return orden.ascendente ? " ▲" : " ▼";
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroFacultad("");
    setFiltroTipo("");
  }

  const texto = normalizar(busqueda.trim());

  let visibles = jugadores.filter((j) => {
    if (filtroFacultad !== "" && j.id_facultad !== Number(filtroFacultad)) {
      return false;
    }
    if (filtroTipo !== "" && j.tipo !== filtroTipo) {
      return false;
    }
    if (texto === "") {
      return true;
    }
    const todo = normalizar(j.ci + " " + j.nombre + " " + j.apellido + " " + j.email);
    return todo.includes(texto);
  });

  visibles = [...visibles].sort((a, b) => {
    let valorA = a[orden.campo];
    let valorB = b[orden.campo];
    if (orden.campo === "id_facultad") {
      valorA = nombreFacultad(a.id_facultad);
      valorB = nombreFacultad(b.id_facultad);
    }
    const resultado = normalizar(valorA).localeCompare(normalizar(valorB));
    return orden.ascendente ? resultado : -resultado;
  });

  const hayFiltros = busqueda !== "" || filtroFacultad !== "" || filtroTipo !== "";

  return (
    <div>
      <h1>Jugadores</h1>

      {error !== "" && <p className="error">{error}</p>}
      {mensaje !== "" && <p className="mensaje">{mensaje}</p>}

      <form className="formulario" onSubmit={guardar} noValidate>
        <h2>{ciEditando ? "Modificar jugador" : "Nuevo jugador"}</h2>

        <label>
          Cédula
          <input name="ci" value={form.ci} onChange={manejarCambio} disabled={ciEditando !== null} />
        </label>
        <label>
          Nombre
          <input name="nombre" value={form.nombre} onChange={manejarCambio} />
        </label>
        <label>
          Apellido
          <input name="apellido" value={form.apellido} onChange={manejarCambio} />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={manejarCambio} />
        </label>
        <label>
          Fecha de nacimiento
          <input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={manejarCambio} />
        </label>
        <label>
          Facultad
          <select name="id_facultad" value={form.id_facultad} onChange={manejarCambio}>
            <option value="">Elegí una facultad</option>
            {facultades.map((f) => (
              <option key={f.id_facultad} value={f.id_facultad}>
                {f.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select name="tipo" value={form.tipo} onChange={manejarCambio}>
            <option value="grado">Grado</option>
            <option value="posgrado">Posgrado</option>
            <option value="docente">Docente</option>
            <option value="funcionario">Funcionario</option>
          </select>
        </label>

        <div className="botones">
          <button type="submit">{ciEditando ? "Guardar cambios" : "Crear"}</button>
          {ciEditando && (
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
          placeholder="Buscar por nombre, cédula o email"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroFacultad} onChange={(e) => setFiltroFacultad(e.target.value)}>
          <option value="">Todas las facultades</option>
          {facultades.map((f) => (
            <option key={f.id_facultad} value={f.id_facultad}>
              {f.nombre}
            </option>
          ))}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="grado">Grado</option>
          <option value="posgrado">Posgrado</option>
          <option value="docente">Docente</option>
          <option value="funcionario">Funcionario</option>
        </select>
        <span className="contador">
          {visibles.length} de {jugadores.length} jugadores
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
              <th className="ordenable" onClick={() => cambiarOrden("ci")}>Cédula{flecha("ci")}</th>
              <th className="ordenable" onClick={() => cambiarOrden("apellido")}>Jugador{flecha("apellido")}</th>
              <th className="ordenable" onClick={() => cambiarOrden("email")}>Email{flecha("email")}</th>
              <th className="ordenable" onClick={() => cambiarOrden("fecha_nacimiento")}>
                Nacimiento{flecha("fecha_nacimiento")}
              </th>
              <th className="ordenable" onClick={() => cambiarOrden("id_facultad")}>
                Facultad{flecha("id_facultad")}
              </th>
              <th className="ordenable" onClick={() => cambiarOrden("tipo")}>Tipo{flecha("tipo")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan="7">
                  {hayFiltros ? "Ningún jugador coincide con la búsqueda" : "No hay jugadores registrados"}
                </td>
              </tr>
            )}
            {visibles.map((j) => (
              <tr key={j.ci}>
                <td>{j.ci}</td>
                <td>
                  <span className="con-escudo">
                    <Avatar
                      nombre={j.nombre}
                      apellido={j.apellido}
                      color={equipoDeJugador[j.ci] !== undefined ? colorEquipo(equipoDeJugador[j.ci]) : undefined}
                    />
                    {j.apellido}, {j.nombre}
                  </span>
                </td>
                <td>{j.email}</td>
                <td>{j.fecha_nacimiento.split("-").reverse().join("/")}</td>
                <td>{nombreFacultad(j.id_facultad)}</td>
                <td>{nombresTipo[j.tipo]}</td>
                <td>
                  <button onClick={() => empezarEdicion(j)}>Editar</button>
                  <button className="peligro" onClick={() => borrar(j.ci)}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}