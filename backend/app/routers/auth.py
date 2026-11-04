from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..db import conexion
from ..errores import ApiError
from ..seguridad import ADMIN, crear_token, verificar

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    correo: str = Field(min_length=3, max_length=100)
    contrasena: str = Field(min_length=1, max_length=100)


@router.post("/login")
def login(datos: LoginIn):
    # Todavía no hay sesión, así que se consulta la tabla login con el usuario MySQL admin
    # (el planillero no tiene permiso de leer login).
    with conexion(ADMIN) as db:
        fila = db.uno("SELECT correo, contrasena, rol FROM login WHERE correo = %s",
                      (datos.correo.strip().lower(),))
    # Mismo mensaje si no existe el correo o si la contraseña está mal: no damos pistas.
    if fila is None or not verificar(datos.contrasena, fila["contrasena"]):
        raise ApiError(401, "Correo o contraseña incorrectos")
    return {"token": crear_token(fila["correo"], fila["rol"]), "rol": fila["rol"]}
