"""Acceso a MySQL sin ORM.

- Un pool de conexiones por rol (administrador / planillero), cada uno con su usuario MySQL.
- Todas las consultas se escriben a mano y SIEMPRE con parámetros (%s): nunca se arma SQL
  concatenando texto que viene del usuario, para evitar SQL injection.
"""
from contextlib import contextmanager

from mysql.connector import pooling

from . import config

_pools: dict[str, pooling.MySQLConnectionPool] = {}


def _pool(rol: str) -> pooling.MySQLConnectionPool:
    # Se crea recién en el primer uso, así la API levanta aunque la base todavía esté arrancando.
    if rol not in _pools:
        usuario, contrasena = config.DB_USUARIOS[rol]
        _pools[rol] = pooling.MySQLConnectionPool(
            pool_name=f"pool_{rol}",
            pool_size=5,
            host=config.DB_HOST,
            port=config.DB_PORT,
            database=config.DB_NAME,
            user=usuario,
            password=contrasena,
            charset="utf8mb4",
            collation="utf8mb4_0900_ai_ci",
            autocommit=False,
        )
    return _pools[rol]


class Db:
    """Envuelve una conexión con helpers para no repetir código de cursores."""

    def __init__(self, conexion):
        self.conexion = conexion

    def todos(self, sql: str, params: tuple = ()) -> list[dict]:
        cur = self.conexion.cursor(dictionary=True)
        try:
            cur.execute(sql, params)
            return cur.fetchall()
        finally:
            cur.close()

    def uno(self, sql: str, params: tuple = ()) -> dict | None:
        filas = self.todos(sql, params)
        return filas[0] if filas else None

    def ejecutar(self, sql: str, params: tuple = ()) -> tuple[int, int]:
        """Para INSERT/UPDATE/DELETE. Devuelve (filas_afectadas, id_generado)."""
        cur = self.conexion.cursor()
        try:
            cur.execute(sql, params)
            return cur.rowcount, cur.lastrowid
        finally:
            cur.close()


@contextmanager
def conexion(rol: str):
    """Abre una transacción con el usuario MySQL del rol.

    Si todo sale bien hace commit; si algo falla (regla del torneo, error de MySQL)
    hace rollback, así nunca queda la base a medio modificar.
    """
    cnx = _pool(rol).get_connection()
    try:
        yield Db(cnx)
        cnx.commit()
    except Exception:
        cnx.rollback()
        raise
    finally:
        cnx.close()  # devuelve la conexión al pool
