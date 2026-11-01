"""Login: contraseñas con bcrypt, token JWT con el rol, y control de permisos por endpoint."""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import config
from .db import conexion
from .errores import ApiError

ADMIN = "administrador"
PLANILLERO = "planillero"

_bearer = HTTPBearer(auto_error=False)


def hashear(contrasena: str) -> str:
    return bcrypt.hashpw(contrasena.encode(), bcrypt.gensalt()).decode()


def verificar(contrasena: str, hash_guardado: str) -> bool:
    try:
        return bcrypt.checkpw(contrasena.encode(), hash_guardado.encode())
    except ValueError:  # hash mal formado en la base
        return False


def crear_token(correo: str, rol: str) -> str:
    ahora = datetime.now(timezone.utc)
    datos = {"sub": correo, "rol": rol, "iat": ahora,
             "exp": ahora + timedelta(hours=config.JWT_EXPIRA_HORAS)}
    return jwt.encode(datos, config.JWT_SECRET, algorithm="HS256")


def usuario_actual(cred: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if cred is None:
        raise ApiError(401, "Tenés que iniciar sesión")
    try:
        datos = jwt.decode(cred.credentials, config.JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise ApiError(401, "La sesión expiró, volvé a iniciar sesión")
    except jwt.InvalidTokenError:
        raise ApiError(401, "Sesión inválida")
    if datos.get("rol") not in (ADMIN, PLANILLERO):
        raise ApiError(401, "Sesión inválida")
    return {"correo": datos["sub"], "rol": datos["rol"]}


def requiere(*roles: str):
    """Dependencia que deja pasar solo a los roles indicados y abre la conexión
    a MySQL con el usuario de ese rol.

    Uso:  def endpoint(db = Depends(requiere(ADMIN))): ...
    """
    def _dep(usuario: dict = Depends(usuario_actual)):
        if usuario["rol"] not in roles:
            raise ApiError(403, "No tenés permiso para hacer esta operación")
        with conexion(usuario["rol"]) as db:
            yield db
    return _dep


solo_admin = requiere(ADMIN)
admin_o_planillero = requiere(ADMIN, PLANILLERO)
