import { useEffect, useState } from "react";
import {
  listarTorneos,
  crearTorneo,
  editarTorneo,
  borrarTorneo,
  cambiarEstadoTorneo,
} from "../api/torneos";

const formularioVacio = {
  nombre: "Torneo Interfacultades",
  anio: String(new Date().getFullYear()),
  semestre: "",
  fecha_inicio: "",
  fecha_fin: "",
};

const nombresEstado = {
  inscripcion: "Inscripción",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

// qué etapa sigue, el texto del botón y el aviso antes de cambiar
const siguienteEtapa = {
  inscripcion: {
    estado: "en_curso",
    boton: "Iniciar torneo",
    aviso: "Al iniciar el torneo ya no se van a poder crear equipos ni modificar planteles. ¿Continuar?",
  },
  en_curso: {
    estado: "finalizado",
    boton: "Finalizar torneo",
    aviso: "¿Seguro que querés dar por finalizado el torneo?",
  },
};

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [form, setForm] = useState(formularioVacio);
  const [idEditando, setIdEditando] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarTorneos() {
    try {
      setTorneos(await listarTorneos());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargarTorneos();
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

  function formatearDia(dia) {
    const partes = dia.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
  }

  // formulario

  function cambiarForm(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function cancelar() {
    setForm(formularioVacio);
    setIdEditando(null);
  }

  function validar() {
    if (form.nombre.trim() === "" || form.anio === "" || form.semestre === "" ||
        form.fecha_inicio === "" || form.fecha_fin === "") {
      return "Completá todos los datos del torneo";
    }
    const anio = Number(form.anio);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      return "El año no es válido";
    }
    if (!form.fecha_inicio.startsWith(form.anio) || !form.fecha_fin.startsWith(form.anio)) {
      return "Las fechas de inicio y fin tienen que ser del año " + form.anio;
    }
    if (form.fecha_fin <= form.fecha_inicio) {
      return "La fecha de fin tiene que ser posterior a la de inicio";
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

    const torneo = {
      nombre: form.nombre.trim(),
      anio: Number(form.anio),
      semestre: Number(form.semestre),
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
    };

    try {
      if (idEditando) {
        await editarTorneo(idEditando, torneo);
        setMensaje("Torneo modificado");
      } else {
        await crearTorneo(torneo);
        setMensaje("Torneo creado. Arranca en etapa de inscripción");
      }
      cancelar();
      cargarTorneos();
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicion(t) {
    limpiarMensajes();
    setIdEditando(t.id_torneo);
    setForm({
      nombre: t.nombre,
      anio: String(t.anio),
      semestre: String(t.semestre),
      fecha_inicio: t.fecha_inicio,
      fecha_fin: t.fecha_fin,
    });
    window.scrollTo(0, 0);
  }

  // acciones de la tabla

  async function avanzarEtapa(t) {
    const siguiente = siguienteEtapa[t.estado];
    if (!window.confirm(siguiente.aviso)) {
      return;
    }
    limpiarMensajes();
    try {
      await cambiarEstadoTorneo(t.id_torneo, siguiente.estado);
      setMensaje("El torneo pasó a la etapa " + nombresEstado[siguiente.estado].toLowerCase());
      cargarTorneos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function borrar(t) {
    const texto = t.nombre + " " + t.anio + " - " + t.semestre + "º semestre";
    if (!window.confirm("¿Seguro que querés borrar " + texto + "?")) {
      return;
    }
    limpiarMensajes();
    try {
      await borrarTorneo(t.id_torneo);
      setMensaje("Torneo borrado");
      cargarTorneos();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Torneos</h1>

      {error !== "" && <p className="error">{error}</p>}
      {mensaje !== "" && <p className="mensaje">{mensaje}</p>}

      <form className="formulario" onSubmit={guardar} noValidate>
        <h2>{idEditando ? "Modificar torneo" : "Nueva edición del torneo"}</h2>
        <label>
          Nombre
          <input name="nombre" value={form.nombre} onChange={cambiarForm} />
        </label>
        <label>
          Año
          <input name="anio" type="number" min="2000" max="2100" value={form.anio} onChange={cambiarForm} />
        </label>
        <label>
          Semestre
          <select name="semestre" value={form.semestre} onChange={cambiarForm}>
            <option value="">Elegí un semestre</option>
            <option value="1">Primer semestre</option>
            <option value="2">Segundo semestre</option>
          </select>
        </label>
        <label>
          Fecha de inicio
          <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={cambiarForm} />
        </label>
        <label>
          Fecha de fin
          <input
            name="fecha_fin"
            type="date"
            value={form.fecha_fin}
            onChange={cambiarForm}
            min={form.fecha_inicio}
          />
        </label>
        <div className="botones">
          <button type="submit">{idEditando ? "Guardar cambios" : "Crear torneo"}</button>
          {idEditando && (
            <button type="button" className="secundario" onClick={cancelar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Torneo</th>
              <th>Edición</th>
              <th>Período</th>
              <th>Etapa</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {torneos.length === 0 && (
              <tr>
                <td colSpan="5">No hay torneos cargados</td>
              </tr>
            )}
            {torneos.map((t) => (
              <tr key={t.id_torneo}>
                <td>{t.nombre}</td>
                <td>
                  {t.anio} · {t.semestre}º semestre
                </td>
                <td>
                  {formatearDia(t.fecha_inicio)} al {formatearDia(t.fecha_fin)}
                </td>
                <td>
                  <span className={"estado estado-" + t.estado}>{nombresEstado[t.estado]}</span>
                </td>
                <td>
                  {siguienteEtapa[t.estado] && (
                    <button onClick={() => avanzarEtapa(t)}>{siguienteEtapa[t.estado].boton}</button>
                  )}
                  {t.estado !== "finalizado" && (
                    <button className="secundario" onClick={() => empezarEdicion(t)}>Editar</button>
                  )}
                  {t.estado === "inscripcion" && (
                    <button className="peligro" onClick={() => borrar(t)}>Borrar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}