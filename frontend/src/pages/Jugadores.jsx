import { useEffect, useState } from "react";
import {
  listarJugadores,
  listarFacultades,
  crearJugador,
  editarJugador,
  borrarJugador,
} from "../api/jugadores";

const formularioVacio = {
  ci: "",
  nombre: "",
  apellido: "",
  email: "",
  fecha_nacimiento: "",
  id_facultad: "",
  tipo: "grado",
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
  const [jugadores, setJugadores] = useState([]);
  const [facultades, setFacultades] = useState([]);
  const [form, setForm] = useState(formularioVacio);
  const [ciEditando, setCiEditando] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarDatos() {
    try {
      setJugadores(await listarJugadores());
      setFacultades(await listarFacultades());
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
    setForm(jugador);
    setCiEditando(jugador.ci);
    setError("");
    setMensaje("");
  }

  async function borrar(ci) {
    if (!window.confirm("¿Seguro que querés borrar este jugador?")) {
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

  return (
    <div>
      <h1>Jugadores</h1>

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

        {error !== "" && <p className="error">{error}</p>}
        {mensaje !== "" && <p className="mensaje">{mensaje}</p>}

        <div className="botones">
          <button type="submit">{ciEditando ? "Guardar cambios" : "Crear"}</button>
          {ciEditando && (
            <button type="button" className="secundario" onClick={cancelar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="tabla-scroll"><table>
        <thead>
          <tr>
            <th>Cédula</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Nacimiento</th>
            <th>Facultad</th>
            <th>Tipo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map((j) => (
            <tr key={j.ci}>
              <td>{j.ci}</td>
              <td>{j.nombre} {j.apellido}</td>
              <td>{j.email}</td>
              <td>{j.fecha_nacimiento}</td>
              <td>{nombreFacultad(j.id_facultad)}</td>
              <td>{j.tipo}</td>
              <td>
                <button onClick={() => empezarEdicion(j)}>Editar</button>
                <button className="peligro" onClick={() => borrar(j.ci)}>Borrar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}