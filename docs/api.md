# Contrato de API — Torneo Interfacultades Fútbol 5

Borrador para acordar en grupo. Backend y frontend se guían por este archivo para trabajar en paralelo.
Si se cambia algo, se actualiza acá primero.

## Convenciones

- Base URL: `http://localhost:8000/api`
- Todo se envía y recibe en JSON.
- Autenticación: header `Authorization: Bearer <token>` (se obtiene en el login).
- Fechas en formato `YYYY-MM-DD`, horas en `HH:MM`.
- Errores: código HTTP + cuerpo `{"error": "mensaje claro para mostrar al usuario"}`.
  - `400` datos inválidos · `401` sin login · `403` sin permiso · `404` no existe · `409` viola una regla del torneo
- Roles: **A** = administrador, **P** = planillero.

## Login

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/login` | — | Body `{correo, contrasena}` → `{token, rol}` |

## Torneos

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/torneos` | A, P | Lista de ediciones |
| POST | `/torneos` | A | Crear `{nombre, anio, semestre, fecha_inicio, fecha_fin}` (arranca en `inscripcion`) |
| GET | `/torneos/{id}` | A, P | Detalle |
| PUT | `/torneos/{id}` | A | Modificar |
| DELETE | `/torneos/{id}` | A | Borrar (solo si no tiene partidos jugados) |
| PATCH | `/torneos/{id}/estado` | A | `{estado: inscripcion \| en_curso \| finalizado}` |

## Facultades y turnos (solo lectura, vienen cargados)

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/facultades` | A, P | `[{id_facultad, nombre}]` |
| GET | `/turnos` | A, P | `[{id_turno, hora_inicio, hora_fin}]` |

## Jugadores

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/jugadores?facultad=&tipo=` | A | Lista con filtros opcionales |
| POST | `/jugadores` | A | Crear |
| GET | `/jugadores/{ci}` | A | Detalle |
| PUT | `/jugadores/{ci}` | A | Modificar |
| DELETE | `/jugadores/{ci}` | A | Borrar |

Body:
```json
{"ci": "12345678", "nombre": "Juan", "apellido": "Pérez", "email": "juan@correo.ucu.edu.uy",
 "fecha_nacimiento": "2004-05-10", "id_facultad": 1, "tipo": "grado"}
```
`tipo`: `grado | posgrado | docente | funcionario`

## Equipos y planteles

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/equipos?torneo=` | A, P | Equipos de una edición |
| POST | `/equipos` | A | Crear `{nombre, id_torneo, id_facultad, ci_capitan}` |
| GET | `/equipos/{id}` | A, P | Detalle con plantel |
| PUT | `/equipos/{id}` | A | Modificar (nombre, capitán) |
| DELETE | `/equipos/{id}` | A | Borrar (solo en inscripción) |
| GET | `/equipos/{id}/plantel` | A, P | `[{ci_jugador, nombre, apellido, tipo, numero_camiseta}]` |
| POST | `/equipos/{id}/plantel` | A | Agregar `{ci_jugador, numero_camiseta}` |
| PUT | `/equipos/{id}/plantel/{ci}` | A | Cambiar número de camiseta |
| DELETE | `/equipos/{id}/plantel/{ci}` | A | Quitar jugador |

Reglas (`409` si fallan): plantel de 5 a 10, máximo 2 docentes/funcionarios, jugador de la misma facultad,
un solo equipo por edición, cambios solo en etapa de inscripción, capitán debe estar en el plantel.

## Complejos y canchas

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/complejos` | A | Lista |
| POST | `/complejos` | A | Crear `{nombre, direccion, departamento}` |
| PUT | `/complejos/{id}` | A | Modificar |
| DELETE | `/complejos/{id}` | A | Borrar |
| GET | `/complejos/{id}/canchas` | A | Canchas del complejo |
| POST | `/complejos/{id}/canchas` | A | Crear `{nombre_cancha, superficie, techada}` |
| PUT | `/complejos/{id}/canchas/{nombre}` | A | Modificar |
| DELETE | `/complejos/{id}/canchas/{nombre}` | A | Borrar |

`superficie`: `sintetico | parquet` · `techada`: `true | false`

## Partidos

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/partidos?torneo=&fecha=&estado=` | A, P | Lista con resultado calculado |
| POST | `/partidos` | A | Programar |
| GET | `/partidos/{id}` | A, P | Detalle con goles, tarjetas y planilla |
| PUT | `/partidos/{id}` | A | Reprogramar |
| DELETE | `/partidos/{id}` | A | Borrar (nunca si está jugado) |
| PATCH | `/partidos/{id}/estado` | A, P | `{estado: programado \| jugado \| postergado \| cancelado}` |

Body:
```json
{"id_torneo": 1, "numero_fecha": 1, "id_equipo_local": 3, "id_equipo_visitante": 5,
 "dia": "2026-11-10", "id_turno": 2, "nombre_cancha": "Cancha 1", "id_complejo": 1}
```

Respuesta de lista incluye `goles_local` y `goles_visitante` (calculados desde la tabla gol).

Reglas (`409`): misma edición, ambos con 5+ jugadores, no contra sí mismo, no repetir cruce salvo cancelado,
un partido por equipo por fecha, una cancha por día y turno, `jugado` solo si el día y turno ya pasaron,
correcciones solo dentro de 48 horas.

## Planilla, goles y tarjetas

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/partidos/{id}/planilla` | A, P | Jugadores que participaron |
| POST | `/partidos/{id}/planilla` | A, P | Agregar `{ci_jugador, id_equipo}` |
| DELETE | `/partidos/{id}/planilla/{ci}` | A, P | Quitar |
| GET | `/partidos/{id}/goles` | A, P | Lista |
| POST | `/partidos/{id}/goles` | A, P | `{ci_jugador, minuto, autogol}` |
| PUT | `/goles/{id_gol}` | A, P | Corregir (dentro de 48 horas) |
| DELETE | `/goles/{id_gol}` | A, P | Borrar (dentro de 48 horas) |
| GET | `/partidos/{id}/tarjetas` | A, P | Lista |
| POST | `/partidos/{id}/tarjetas` | A, P | `{ci_jugador, minuto, color}` |
| PUT | `/tarjetas/{id_tarjeta}` | A, P | Corregir |
| DELETE | `/tarjetas/{id_tarjeta}` | A, P | Borrar |

Reglas (`409`): en la planilla solo jugadores del plantel de alguno de los dos equipos y no suspendidos;
goles y tarjetas solo de jugadores en la planilla. `color`: `amarilla | roja`. `minuto`: 0 a 60.

## Sanciones

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/sanciones?torneo=&ci=` | A | Lista (incluye las automáticas) |
| POST | `/sanciones` | A | Crear `{ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas}` |
| PUT | `/sanciones/{id}` | A | Modificar |
| DELETE | `/sanciones/{id}` | A | Borrar |

`motivo`: `roja | acumulacion_amarillas | disciplinaria`. Las de roja y amarillas las crea la base automáticamente.

## Reportes

Todos `GET`, rol A, con `?torneo=<id>` salvo donde se indica.

| Ruta | Reporte |
| --- | --- |
| `/reportes/posiciones` | PJ, PG, PE, PP, GF, GC, DG, puntos (ordenado por puntos, DG, GF) |
| `/reportes/goleadores` | Top 10 goleadores |
| `/reportes/fair-play` | Puntaje por equipo (amarilla 1, roja 3), menor primero |
| `/reportes/promedio-goles` | Promedio por fecha y total de la edición |
| `/reportes/canchas-turnos` | Canchas y turnos más usados |
| `/reportes/jugadores-facultad-tipo` | Cantidad por facultad y tipo (sin `torneo`) |
| `/reportes/nunca-jugaron` | Inscriptos que nunca figuraron en una planilla |
| `/reportes/sanciones` | Cantidad por equipo y por motivo |
| `/reportes/estado-partidos` | % jugados vs. postergados/cancelados |
| `/reportes/extra-1` | A definir |
| `/reportes/extra-2` | A definir |
| `/reportes/extra-3` | A definir |

Cada reporte devuelve una lista de filas, por ejemplo:
```json
[{"equipo": "Ingeniería FC", "pj": 3, "pg": 2, "pe": 1, "pp": 0, "gf": 8, "gc": 3, "dg": 5, "puntos": 7}]
```
