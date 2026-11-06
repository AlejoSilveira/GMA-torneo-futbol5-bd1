#!/bin/bash
# =====================================================================
# 03_usuarios.sh: crea los dos usuarios MySQL de la aplicacion con permisos
# diferenciados. Es .sh (y no .sql) porque lee las claves de variables de
# entorno: asi ninguna contrasena queda escrita en el repo.
#
# Variables (las mismas del .env del backend):
#   DB_ADMIN_USER, DB_ADMIN_PASSWORD, DB_PLANILLERO_USER, DB_PLANILLERO_PASSWORD
#   y la clave de root: MYSQL_ROOT_PASSWORD (Docker) o DB_ROOT_PASSWORD (local)
#
# En Docker lo corre solo el entrypoint de mysql (docker-entrypoint-initdb.d).
# Local (Git Bash / Linux, con el cliente mysql en el PATH):
#   DB_ROOT_PASSWORD=... DB_ADMIN_PASSWORD=... DB_PLANILLERO_PASSWORD=... bash db/03_usuarios.sh
#
# Sin "set -e": el entrypoint de Docker puede ejecutarlo con "source".
# =====================================================================

if [ -z "${DB_ADMIN_PASSWORD:-}" ] || [ -z "${DB_PLANILLERO_PASSWORD:-}" ]; then
    echo "03_usuarios.sh: faltan DB_ADMIN_PASSWORD y/o DB_PLANILLERO_PASSWORD" >&2
    exit 1
fi

_usr_admin="${DB_ADMIN_USER:-torneo_admin}"
_usr_plan="${DB_PLANILLERO_USER:-torneo_planillero}"

# escapa comillas simples y barras para meter la clave dentro de un literal SQL
_sql_literal() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/''/g"; }
_pass_admin="$(_sql_literal "$DB_ADMIN_PASSWORD")"
_pass_plan="$(_sql_literal "$DB_PLANILLERO_PASSWORD")"

_sql_usuarios=$(cat <<SQL
USE torneo_futbol5;

-- '%': el backend se conecta desde otro contenedor (no desde localhost)
CREATE USER IF NOT EXISTS '${_usr_admin}'@'%' IDENTIFIED BY '${_pass_admin}';
ALTER USER '${_usr_admin}'@'%' IDENTIFIED BY '${_pass_admin}';
CREATE USER IF NOT EXISTS '${_usr_plan}'@'%' IDENTIFIED BY '${_pass_plan}';
ALTER USER '${_usr_plan}'@'%' IDENTIFIED BY '${_pass_plan}';

-- ADMINISTRADOR: ABM de todo, sin DDL (no crea ni borra tablas) y sin GRANT.
-- En login solo lectura: la usa el back para validar el ingreso, no hay ABM de usuarios.
GRANT SELECT ON torneo_futbol5.login TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.facultad              TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.jugador               TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.torneo                TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.equipo                TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.equipo_jugador_torneo TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.complejo              TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.cancha                TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.turno                 TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.partido               TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.planilla_partido      TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.gol                   TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.tarjeta               TO '${_usr_admin}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.sancion_jugador       TO '${_usr_admin}'@'%';

-- PLANILLERO: solo registra planillas, goles y tarjetas (letra) y marca el partido como jugado.
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.planilla_partido TO '${_usr_plan}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.gol              TO '${_usr_plan}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.tarjeta          TO '${_usr_plan}'@'%';
-- permiso a nivel de COLUMNA: puede cambiar el estado del partido, nada mas
GRANT SELECT, UPDATE (estado) ON torneo_futbol5.partido TO '${_usr_plan}'@'%';
-- lectura de lo que necesita para armar la planilla (sin login ni complejos)
GRANT SELECT ON torneo_futbol5.torneo                TO '${_usr_plan}'@'%';
GRANT SELECT ON torneo_futbol5.facultad              TO '${_usr_plan}'@'%';
GRANT SELECT ON torneo_futbol5.turno                 TO '${_usr_plan}'@'%';
GRANT SELECT ON torneo_futbol5.equipo                TO '${_usr_plan}'@'%';
GRANT SELECT ON torneo_futbol5.equipo_jugador_torneo TO '${_usr_plan}'@'%';
GRANT SELECT ON torneo_futbol5.jugador               TO '${_usr_plan}'@'%';
GRANT SELECT ON torneo_futbol5.sancion_jugador       TO '${_usr_plan}'@'%';
-- las sanciones automaticas las crea el trigger con los permisos de su DEFINER (root),
-- por eso el planillero no necesita INSERT en sancion_jugador
SQL
)

if declare -F docker_process_sql > /dev/null; then
    # ejecutado con "source" por el entrypoint oficial de mysql
    printf '%s\n' "$_sql_usuarios" | docker_process_sql
else
    MYSQL_PWD="${MYSQL_ROOT_PASSWORD:-${DB_ROOT_PASSWORD:-}}" \
        mysql -uroot -h "${DB_INIT_HOST:-localhost}" <<< "$_sql_usuarios" || exit 1
fi

echo "03_usuarios.sh: usuarios '${_usr_admin}' y '${_usr_plan}' listos"
unset _pass_admin _pass_plan _sql_usuarios
