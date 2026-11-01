# Backend — FastAPI + mysql-connector (sin ORM)

## Correr local

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env        # y completar las claves
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva: http://localhost:8000/docs

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `app/config.py` | Lee el `.env` |
| `app/db.py` | Pool de conexiones por rol (usuario MySQL admin / planillero), transacción con commit o rollback |
| `app/seguridad.py` | bcrypt, token JWT con el rol, dependencias `solo_admin` / `admin_o_planillero` |
| `app/errores.py` | Formato `{"error": "..."}` y mapeo de errores MySQL (1644/1062/1451/1452 → 409, 3819 → 400) |
| `app/routers/` | Un archivo por recurso del `docs/api.md` |

## Decisiones

- Cada request usa la conexión del usuario MySQL de su rol: si un planillero intenta algo que no le corresponde, lo frena la API (403) y además la base (no tiene el permiso).
- Todo el SQL es a mano y parametrizado (`%s`), nunca concatenado.
- Cada request es una transacción: si una regla falla a mitad de camino, se hace rollback.
- Contraseñas con bcrypt. El login responde el mismo mensaje si el correo no existe o la contraseña está mal.

## Reglas que decidimos en el back (además de las de la letra)

- **Torneo**: solo avanza de etapa en orden. Para pasar a `en_curso`: al menos 2 equipos, todos con 5 a 10 jugadores y capitán. Para `finalizado`: sin partidos programados ni postergados. Solo se borra si no tiene equipos ni partidos.
- **Equipo**: se crea sin capitán (`ci_capitan` null) y se asigna con PUT cuando ya está en el plantel. No se puede quitar al capitán del plantel. Durante la inscripción se puede bajar de 5 jugadores (se está armando); el mínimo se exige al programar partidos y al empezar el torneo. Número de camiseta 1–99, sin repetir en el equipo.
- **Jugador**: no se le cambia facultad o tipo si ya integra un plantel (rompería las reglas del equipo).
- **Partido**: el día tiene que estar dentro de las fechas del torneo. Reprogramar un postergado lo vuelve a `programado`. Un partido jugado o cancelado no cambia de estado. El planillero solo puede marcar `jugado`; postergar/cancelar es del admin.
- **Planilla, goles y tarjetas**: se cargan desde que termina el turno hasta 48 h después (hora de Uruguay). No en partidos cancelados o postergados. Para quitar a alguien de la planilla primero se borran sus goles/tarjetas.
