# db/ — Base de datos (MySQL 8)

| Archivo | Qué hace |
| --- | --- |
| `01_schema.sql` | Crea la base `torneo_futbol5` desde cero: 14 tablas, PK, FK, UNIQUE, CHECK, ENUM, índices y los 5 turnos |
| `02_triggers.sql` | Reglas del torneo que no entran en un CHECK: planteles, programación de partidos, planilla y sanciones automáticas |
| `03_usuarios.sh` | Crea los usuarios MySQL `admin` y `planillero` con permisos distintos. Lee las claves del `.env` (nunca quedan en el repo) |
| `04_datos.sql` | Datos de prueba ficticios: 2 torneos, 10 equipos, 48 jugadores, 22 partidos, sanciones de los 3 motivos |
| `pruebas/pruebas.sql` | 87 casos que prueban cada restricción y trigger. No deja cambios (corre en una transacción que se deshace) |

Se ejecutan **en orden** (01 → 02 → 03 → 04). Docker los corre solo, en orden alfabético, la primera vez que se crea el volumen. La carpeta `pruebas/` no la ejecuta.

## Con Docker (lo que necesita el `docker-compose.yml`)

```yaml
db:
  image: mysql:8.4
  environment:
    MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    MYSQL_DATABASE: torneo_futbol5
    DB_ADMIN_USER: ${DB_ADMIN_USER}
    DB_ADMIN_PASSWORD: ${DB_ADMIN_PASSWORD}
    DB_PLANILLERO_USER: ${DB_PLANILLERO_USER}
    DB_PLANILLERO_PASSWORD: ${DB_PLANILLERO_PASSWORD}
  volumes:
    - ./db:/docker-entrypoint-initdb.d:ro
```

Los scripts solo corren cuando el volumen de datos está vacío. Para recrear la base: `docker compose down -v` y `docker compose up`.

## Local (DataGrip o consola, con root)

1. Ejecutar `01_schema.sql`, `02_triggers.sql` y `04_datos.sql` (en DataGrip: clic derecho → *Run*).
2. Usuarios: desde Git Bash, con el cliente `mysql` en el PATH:
   ```bash
   DB_ROOT_PASSWORD=... DB_ADMIN_PASSWORD=... DB_PLANILLERO_PASSWORD=... bash db/03_usuarios.sh
   ```
   Las claves tienen que ser las mismas del `backend/.env`.
3. Opcional: ejecutar `pruebas/pruebas.sql`. Al final muestra una tabla con OK / FALLA por caso y el resumen (tiene que dar 0 fallas).

## Usuarios de la aplicación (solo para pruebas)

| Correo | Contraseña | Rol |
| --- | --- | --- |
| `admin@ucu.edu.uy` | `Admin2026!` | administrador |
| `planillero@ucu.edu.uy` | `Planillero2026!` | planillero |

En la base se guarda solo el hash bcrypt. Un CHECK rechaza cualquier contraseña que no tenga formato bcrypt.

## Importante: las fechas son relativas

`04_datos.sql` arma las fechas a partir del día en que se ejecuta: la fecha 3 del torneo en curso se jugó **ayer** (se puede corregir, ventana de 48 h) y las fechas 4 y 5 son a futuro. **Antes de la defensa, recrear la base** (`docker compose down -v`) para que esto siga siendo cierto ese día.

## Errores que devuelve la base

| Código MySQL | Qué es | HTTP en el back |
| --- | --- | --- |
| 1644 | Regla del torneo (trigger). El mensaje viene en español, listo para mostrar | 409 |
| 1062 | UNIQUE (cancha ocupada, cruce repetido, jugador en dos equipos, camiseta repetida) | 409 |
| 1451 / 1452 | FK (por ejemplo, quitar al capitán del plantel o un equipo de otra edición) | 409 |
| 3819 | CHECK (minuto, camiseta, CI, email, departamento...) | 400 |
