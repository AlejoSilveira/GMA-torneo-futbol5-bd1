"""Configuración leída del .env (nunca hay claves escritas en el código)."""
import os

from dotenv import load_dotenv

load_dotenv()


def _requerida(nombre: str) -> str:
    valor = os.getenv(nombre)
    if not valor:
        raise RuntimeError(f"Falta la variable de entorno {nombre} (ver .env.example)")
    return valor


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "torneo_futbol5")

# Un usuario MySQL por rol: así la base misma limita lo que puede hacer un planillero.
DB_USUARIOS = {
    "administrador": (_requerida("DB_ADMIN_USER"), _requerida("DB_ADMIN_PASSWORD")),
    "planillero": (_requerida("DB_PLANILLERO_USER"), _requerida("DB_PLANILLERO_PASSWORD")),
}

JWT_SECRET = _requerida("JWT_SECRET")
JWT_EXPIRA_HORAS = int(os.getenv("JWT_EXPIRA_HORAS", "8"))

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
