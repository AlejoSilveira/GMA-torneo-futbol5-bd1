"""Errores de la API con el formato del api.md: código HTTP + {"error": "mensaje"}."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from mysql.connector import errors as mysql_errors
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("torneo")


class ApiError(Exception):
    def __init__(self, status: int, mensaje: str):
        self.status = status
        self.mensaje = mensaje


# Atajos para las reglas del torneo
def no_encontrado(mensaje: str) -> ApiError:
    return ApiError(404, mensaje)


def conflicto(mensaje: str) -> ApiError:
    return ApiError(409, mensaje)


def invalido(mensaje: str) -> ApiError:
    return ApiError(400, mensaje)


# Errores de MySQL -> respuesta HTTP (acordado con Germán)
_MYSQL_A_HTTP = {
    1644: (409, None),  # SIGNAL de un trigger: el mensaje ya viene en español, se muestra tal cual
    1062: (409, "Ya existe un registro con esos datos"),
    1451: (409, "No se puede borrar: hay otros datos que dependen de este registro"),
    1452: (409, "Hace referencia a un dato que no existe"),
    3819: (400, "Algún dato no cumple las restricciones de la base"),
    1142: (403, "No tenés permiso para hacer esta operación"),  # permiso denegado al usuario MySQL
    1143: (403, "No tenés permiso para hacer esta operación"),  # permiso denegado sobre una columna
    2003: (503, "No se pudo conectar a la base de datos"),
    2013: (503, "Se perdió la conexión con la base de datos"),
}


def _json(status: int, mensaje: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": mensaje})


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError):
        return _json(exc.status, exc.mensaje)

    @app.exception_handler(mysql_errors.Error)
    async def _mysql_error(_: Request, exc: mysql_errors.Error):
        status, mensaje = _MYSQL_A_HTTP.get(exc.errno, (None, None))
        if status is None:
            log.exception("Error de MySQL no mapeado (%s)", exc.errno)
            return _json(500, "Error interno de la base de datos")
        return _json(status, mensaje or exc.msg)

    @app.exception_handler(RequestValidationError)
    async def _validacion(_: Request, exc: RequestValidationError):
        primero = exc.errors()[0]
        campo = ".".join(str(p) for p in primero["loc"] if p not in ("body", "query", "path"))
        return _json(400, f"Dato inválido en '{campo}': {_traducir(primero)}" if campo
                     else f"Dato inválido: {_traducir(primero)}")


def _traducir(err: dict) -> str:
    """Mensajes de Pydantic en español para mostrar en el front."""
    tipo, ctx = err["type"], err.get("ctx", {})
    mensajes = {
        "missing": "es obligatorio",
        "string_too_short": f"tiene que tener al menos {ctx.get('min_length')} caracteres",
        "string_too_long": f"puede tener como máximo {ctx.get('max_length')} caracteres",
        "string_pattern_mismatch": "no tiene el formato correcto",
        "greater_than": f"tiene que ser mayor que {ctx.get('gt')}",
        "greater_than_equal": f"tiene que ser mayor o igual a {ctx.get('ge')}",
        "less_than_equal": f"tiene que ser menor o igual a {ctx.get('le')}",
        "int_parsing": "tiene que ser un número entero",
        "int_type": "tiene que ser un número entero",
        "bool_parsing": "tiene que ser true o false",
        "bool_type": "tiene que ser true o false",
        "date_from_datetime_parsing": "tiene que ser una fecha AAAA-MM-DD",
        "date_parsing": "tiene que ser una fecha AAAA-MM-DD",
        "date_type": "tiene que ser una fecha AAAA-MM-DD",
        "literal_error": f"tiene que ser uno de: {str(ctx.get('expected', '')).replace(' or ', ' o ')}",
        "string_type": "tiene que ser texto",
        "json_invalid": "el cuerpo no es un JSON válido",
    }
    if tipo == "value_error":  # validaciones propias (ej. fechas)
        return str(ctx.get("error", err["msg"]))
    return mensajes.get(tipo, err["msg"])

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        return _json(exc.status_code, str(exc.detail))
