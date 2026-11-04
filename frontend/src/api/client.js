const API_URL = "http://localhost:8000/api";
const USAR_MOCK = true;

const usuariosPrueba = [
  { correo: "admin@ucu.edu.uy", contrasena: "admin123", rol: "administrador" },
  { correo: "planillero@ucu.edu.uy", contrasena: "plani123", rol: "planillero" },
];

export async function pedir(ruta, metodo = "GET", datos = null) {
  const headers = { "Content-Type": "application/json" };

  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const opciones = { method: metodo, headers: headers };
  if (datos) {
    opciones.body = JSON.stringify(datos);
  }

  const respuesta = await fetch(API_URL + ruta, opciones);

  let json = null;
  try {
    json = await respuesta.json();
  } catch {
    json = null;
  }

  if (!respuesta.ok) {
    if (json && json.error) {
      throw new Error(json.error);
    }
    throw new Error("Error al conectar con el servidor");
  }

  return json;
}

export async function login(correo, contrasena) {
  if (USAR_MOCK) {
    const usuario = usuariosPrueba.find(
      (u) => u.correo === correo && u.contrasena === contrasena
    );
    if (!usuario) {
      throw new Error("Correo o contraseña incorrectos");
    }
    return { token: "token-prueba", rol: usuario.rol };
  }

  return pedir("/auth/login", "POST", { correo: correo, contrasena: contrasena });
}