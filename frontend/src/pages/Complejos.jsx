import { useEffect, useState } from "react";
import {
  listarComplejos,
  crearComplejo,
  editarComplejo,
  borrarComplejo,
  listarCanchas,
  crearCancha,
  editarCancha,
  borrarCancha,
} from "../api/complejos";

const departamentos = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida",
  "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha",
  "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres",
];

const complejoVacio = { nombre: "", direccion: "", departamento: "" };
const canchaVacia = { nombre_cancha: "", superficie: "sintetico", techada: false };

export default function Complejos() {
  const [complejos, setComplejos] = useState([]);
  const [formComplejo, setFormComplejo] = useState(complejoVacio);
  const [idEditando, setIdEditando] = useState(null);

  const [complejoElegido, setComplejoElegido] = useState(null);
  const [canchas, setCanchas] = useState([]);
  const [formCancha, setFormCancha] = useState(canchaVacia);
  const [canchaEditando, setCanchaEditando] = useState(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarComplejos() {
    try {
      setComplejos(await listarComplejos());
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarCanchas(idComplejo) {
    try {
      setCanchas(await listarCanchas(idComplejo));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarComplejos();
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

  function limpiarMensajes() {
    setError("");
    setMensaje("");
  }

  // complejos

  function cambiarComplejo(e) {
    setFormComplejo({ ...formComplejo, [e.target.name]: e.target.value });
  }

  function cancelarComplejo() {
    setFormComplejo(complejoVacio);
    setIdEditando(null);
  }

  async function guardarComplejo(e) {
    e.preventDefault();
    limpiarMensajes();

    if (formComplejo.nombre.trim() === "" || formComplejo.direccion.trim() === "" ||
        formComplejo.departamento === "") {
      setError("Completá nombre, dirección y departamento del complejo");
      return;
    }

    try {
      if (idEditando) {
        await editarComplejo(idEditando, formComplejo);
        setMensaje("Complejo modificado");
      } else {
        await crearComplejo(formComplejo);
        setMensaje("Complejo creado");
      }
      cancelarComplejo();
      cargarComplejos();
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicionComplejo(complejo) {
    limpiarMensajes();
    setFormComplejo({
      nombre: complejo.nombre,
      direccion: complejo.direccion,
      departamento: complejo.departamento,
    });
    setIdEditando(complejo.id_complejo);
  }

  async function borrarUnComplejo(complejo) {
    if (!window.confirm("¿Seguro que querés borrar el complejo " + complejo.nombre + "?")) {
      return;
    }
    limpiarMensajes();
    try {
      await borrarComplejo(complejo.id_complejo);
      setMensaje("Complejo borrado");
      if (complejoElegido && complejoElegido.id_complejo === complejo.id_complejo) {
        setComplejoElegido(null);
      }
      cargarComplejos();
    } catch (err) {
      setError(err.message);
    }
  }

  function verCanchas(complejo) {
    limpiarMensajes();
    if (complejoElegido && complejoElegido.id_complejo === complejo.id_complejo) {
      setComplejoElegido(null);
      return;
    }
    setComplejoElegido(complejo);
    setFormCancha(canchaVacia);
    setCanchaEditando(null);
    cargarCanchas(complejo.id_complejo);
  }

  // canchas

  function cambiarCancha(e) {
    if (e.target.name === "techada") {
      setFormCancha({ ...formCancha, techada: e.target.checked });
    } else {
      setFormCancha({ ...formCancha, [e.target.name]: e.target.value });
    }
  }

  function cancelarCancha() {
    setFormCancha(canchaVacia);
    setCanchaEditando(null);
  }

  async function guardarCancha(e) {
    e.preventDefault();
    limpiarMensajes();

    if (formCancha.nombre_cancha.trim() === "") {
      setError("Completá el nombre de la cancha");
      return;
    }

    const id = complejoElegido.id_complejo;
    try {
      if (canchaEditando) {
        await editarCancha(id, canchaEditando, formCancha);
        setMensaje("Cancha modificada");
      } else {
        await crearCancha(id, formCancha);
        setMensaje("Cancha creada");
      }
      cancelarCancha();
      cargarCanchas(id);
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicionCancha(cancha) {
    limpiarMensajes();
    setFormCancha({
      nombre_cancha: cancha.nombre_cancha,
      superficie: cancha.superficie,
      techada: cancha.techada,
    });
    setCanchaEditando(cancha.nombre_cancha);
  }

  async function borrarUnaCancha(cancha) {
    if (!window.confirm("¿Seguro que querés borrar " + cancha.nombre_cancha + "?")) {
      return;
    }
    limpiarMensajes();
    const id = complejoElegido.id_complejo;
    try {
      await borrarCancha(id, cancha.nombre_cancha);
      setMensaje("Cancha borrada");
      cargarCanchas(id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Complejos y canchas</h1>

      {error !== "" && <p className="error">{error}</p>}
      {mensaje !== "" && <p className="mensaje">{mensaje}</p>}

      <form className="formulario" onSubmit={guardarComplejo} noValidate>
        <h2>{idEditando ? "Modificar complejo" : "Nuevo complejo"}</h2>
        <label>
          Nombre
          <input name="nombre" value={formComplejo.nombre} onChange={cambiarComplejo} />
        </label>
        <label>
          Dirección
          <input name="direccion" value={formComplejo.direccion} onChange={cambiarComplejo} />
        </label>
        <label>
          Departamento
          <select name="departamento" value={formComplejo.departamento} onChange={cambiarComplejo}>
            <option value="">Elegí un departamento</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <div className="botones">
          <button type="submit">{idEditando ? "Guardar cambios" : "Crear complejo"}</button>
          {idEditando && (
            <button type="button" className="secundario" onClick={cancelarComplejo}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Dirección</th>
            <th>Departamento</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {complejos.map((c) => (
            <tr key={c.id_complejo}>
              <td>{c.nombre}</td>
              <td>{c.direccion}</td>
              <td>{c.departamento}</td>
              <td>
                <button onClick={() => verCanchas(c)}>
                  {complejoElegido && complejoElegido.id_complejo === c.id_complejo
                    ? "Cerrar canchas"
                    : "Ver canchas"}
                </button>
                <button onClick={() => empezarEdicionComplejo(c)}>Editar</button>
                <button className="peligro" onClick={() => borrarUnComplejo(c)}>Borrar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {complejoElegido && (
        <div className="seccion">
          <h2>Canchas de {complejoElegido.nombre}</h2>

          <form className="formulario" onSubmit={guardarCancha} noValidate>
            <h2>{canchaEditando ? "Modificar cancha" : "Nueva cancha"}</h2>
            <label>
              Nombre
              <input
                name="nombre_cancha"
                value={formCancha.nombre_cancha}
                onChange={cambiarCancha}
                disabled={canchaEditando !== null}
              />
            </label>
            <label>
              Superficie
              <select name="superficie" value={formCancha.superficie} onChange={cambiarCancha}>
                <option value="sintetico">Sintético</option>
                <option value="parquet">Parquet</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="techada"
                checked={formCancha.techada}
                onChange={cambiarCancha}
              />
              Techada
            </label>
            <div className="botones">
              <button type="submit">{canchaEditando ? "Guardar cambios" : "Crear cancha"}</button>
              {canchaEditando && (
                <button type="button" className="secundario" onClick={cancelarCancha}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Superficie</th>
                <th>Techada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {canchas.length === 0 && (
                <tr>
                  <td colSpan="4">Este complejo no tiene canchas</td>
                </tr>
              )}
              {canchas.map((c) => (
                <tr key={c.nombre_cancha}>
                  <td>{c.nombre_cancha}</td>
                  <td>{c.superficie === "sintetico" ? "Sintético" : "Parquet"}</td>
                  <td>{c.techada ? "Sí" : "No"}</td>
                  <td>
                    <button onClick={() => empezarEdicionCancha(c)}>Editar</button>
                    <button className="peligro" onClick={() => borrarUnaCancha(c)}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}