# Torneo Interfacultades de Fútbol 5

Sistema para la gestión del Torneo Interfacultades de Fútbol 5 de la Universidad Católica del Uruguay. Trabajo obligatorio del curso Base de Datos 1, segundo semestre 2026.

Integrantes: Alejo Silveira, Germán Caubarrere y Mathías Porley.

## Tecnologías

- Base de datos: MySQL 8.4
- Backend: Python 3.12 con FastAPI y mysql-connector-python, sin ORM
- Frontend: React con Vite
- Docker y Docker Compose para levantar todo el sistema

## Estructura del repositorio

```
db/          scripts de la base de datos (tablas, triggers, usuarios y datos de prueba)
backend/     API en Python
frontend/    aplicación web en React
docs/        contrato de la API (api.md)
```

## Ejecutar con Docker (recomendado)

Requisitos: tener instalado Docker Desktop y que esté abierto.

1. Clonar el repositorio:

   ```
   git clone https://github.com/AlejoSilveira/GMA-torneo-futbol5-bd1.git
   cd GMA-torneo-futbol5-bd1
   ```

2. Crear el archivo `.env` a partir del ejemplo y completar las contraseñas con cualquier valor:

   ```
   cp .env.example .env
   ```

   En Windows (cmd): `copy .env.example .env`

   Ejemplo de valores:

   ```
   DB_ROOT_PASSWORD=root2026
   DB_ADMIN_PASSWORD=admin2026
   DB_PLANILLERO_PASSWORD=plani2026
   JWT_SECRET=una-clave-larga-cualquiera
   ```

3. Levantar el sistema:

   ```
   docker compose up --build
   ```

   La primera vez tarda algunos minutos. La base de datos se crea y se cargan los datos de prueba automáticamente.

4. Abrir la aplicación en http://localhost:5173

Para apagar el sistema: `Ctrl + C` en la terminal, o `docker compose stop`.

### Volver a cargar la base de datos desde cero

Los scripts de `db/` solo se ejecutan la primera vez que se crea la base. Para borrarla y volver a cargar los datos de prueba:

```
docker compose down -v
docker compose up --build
```

Los datos de prueba usan fechas relativas al día en que se cargan, por lo que conviene recrear la base antes de usar el sistema en otro día.

## Usuarios de prueba

| Correo | Contraseña | Rol |
| --- | --- | --- |
| admin@ucu.edu.uy | Admin2026! | Administrador |
| planillero@ucu.edu.uy | Planillero2026! | Planillero |

El administrador accede a todas las funciones. El planillero solo puede cargar las planillas, los goles y las tarjetas de los partidos.

## Ejecutar sin Docker

Requisitos: MySQL 8, Python 3.12 y Node 20 o superior.

1. Base de datos: ejecutar como root, en orden, `db/01_schema.sql`, `db/02_triggers.sql` y `db/04_datos.sql`. Después crear los usuarios de MySQL con `db/03_usuarios.sh`, como se explica en `db/README.md`.

2. Backend: copiar `backend/.env.example` como `backend/.env`, completar las mismas contraseñas usadas al crear los usuarios y ejecutar:

   ```
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --port 8000
   ```

   En Linux o macOS, el segundo comando es `source venv/bin/activate`.

3. Frontend, en otra terminal:

   ```
   cd frontend
   npm install
   npm run dev
   ```

4. Abrir la aplicación en http://localhost:5173

## Puertos utilizados

| Servicio | Puerto |
| --- | --- |
| Frontend | 5173 |
| Backend | 8000 |
| MySQL | 3306 |

Si alguno de estos puertos está ocupado (por ejemplo, por un MySQL instalado en la computadora), hay que detener ese programa antes de levantar el sistema.