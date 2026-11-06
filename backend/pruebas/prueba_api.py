"""Prueba de punta a punta de la API contra la base configurada en el .env.

Recorre un torneo completo (inscripción, partido, planilla, goles, tarjetas, reportes) y controla
que cada regla de la letra devuelva el código que corresponde. Crea datos nuevos cada vez
(cédulas al azar), así que conviene correrla contra una base de PRUEBA, no la de la entrega.

Necesita en la base: facultades, turnos y un usuario de cada rol en la tabla login.

    cd backend
    pip install -r requirements-dev.txt
    set PRUEBA_ADMIN=admin@ucu.edu.uy:contraseña
    set PRUEBA_PLANILLERO=planillero@ucu.edu.uy:contraseña
    python -m pruebas.prueba_api
"""
import os
import random
import sys
from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.main import app

api = TestClient(app, raise_server_exceptions=False)
fallas: list[str] = []


def chequear(nombre: str, resp, esperado: int):
    ok = resp.status_code == esperado
    detalle = "" if ok else f"  -> {resp.status_code} {resp.text[:200]}"
    print(f"{'OK ' if ok else 'MAL'} {nombre}{detalle}")
    if not ok:
        fallas.append(nombre)
    return resp.json() if resp.content else None


def login(variable: str) -> dict:
    correo, _, contrasena = os.environ[variable].partition(":")
    datos = chequear(f"login {correo}", api.post("/api/auth/login",
                                                 json={"correo": correo, "contrasena": contrasena}), 200)
    return {"Authorization": f"Bearer {datos['token']}"}


def ci_nueva() -> str:
    return str(random.randint(10_000_000, 99_999_999))


def main():
    # ---------- Errores generales y login ----------
    chequear("ruta inexistente da 404 con {error}", api.get("/api/no-existe"), 404)
    assert "error" in api.get("/api/no-existe").json()
    chequear("sin token da 401", api.get("/api/torneos"), 401)
    chequear("token inválido da 401", api.get("/api/torneos", headers={"Authorization": "Bearer x"}), 401)
    chequear("contraseña mal da 401", api.post("/api/auth/login",
                                               json={"correo": "nadie@x.com", "contrasena": "x"}), 401)
    chequear("body inválido da 400", api.post("/api/auth/login", json={}), 400)
    A = login("PRUEBA_ADMIN")
    P = login("PRUEBA_PLANILLERO")

    facultades = chequear("facultades", api.get("/api/facultades", headers=P), 200)
    turnos = chequear("turnos (HH:MM)", api.get("/api/turnos", headers=P), 200)
    assert len(facultades) >= 2 and turnos and len(turnos[0]["hora_inicio"]) == 5
    fac, otra_fac = facultades[0]["id_facultad"], facultades[1]["id_facultad"]

    # ---------- Torneo ----------
    hoy = date.today()
    sufijo = random.randint(1000, 9999)
    t_body = {"nombre": f"Prueba {sufijo}", "anio": hoy.year, "semestre": 2,
              "fecha_inicio": str(hoy - timedelta(days=10)), "fecha_fin": str(hoy + timedelta(days=30))}
    chequear("planillero no crea torneos (403)", api.post("/api/torneos", json=t_body, headers=P), 403)
    chequear("fechas al revés (400)", api.post("/api/torneos", headers=A, json={
        **t_body, "fecha_inicio": t_body["fecha_fin"], "fecha_fin": t_body["fecha_inicio"]}), 400)
    torneo = chequear("crear torneo", api.post("/api/torneos", json=t_body, headers=A), 201)
    id_t = torneo["id_torneo"]
    assert torneo["estado"] == "inscripcion"
    chequear("no puede saltar a finalizado (409)",
             api.patch(f"/api/torneos/{id_t}/estado", json={"estado": "finalizado"}, headers=A), 409)

    # ---------- Complejo y cancha ----------
    comp = chequear("crear complejo", api.post("/api/complejos", headers=A, json={
        "nombre": f"Complejo {sufijo}", "direccion": "Av. Siempre Viva 123", "departamento": "Montevideo"}), 201)
    id_c = comp["id_complejo"]
    chequear("crear cancha", api.post(f"/api/complejos/{id_c}/canchas", headers=A, json={
        "nombre_cancha": "Cancha 1", "superficie": "sintetico", "techada": False}), 201)
    chequear("cancha repetida (409)", api.post(f"/api/complejos/{id_c}/canchas", headers=A, json={
        "nombre_cancha": "Cancha 1", "superficie": "parquet", "techada": True}), 409)

    # ---------- Jugadores ----------
    def jugador(tipo="grado", facultad=fac):
        ci = ci_nueva()
        chequear(f"crear jugador {tipo}", api.post("/api/jugadores", headers=A, json={
            "ci": ci, "nombre": "Juan", "apellido": f"Prueba{ci}", "email": f"j{ci}@correo.ucu.edu.uy",
            "fecha_nacimiento": "2003-04-05", "id_facultad": facultad, "tipo": tipo}), 201)
        return ci

    chequear("CI con letras (400)", api.post("/api/jugadores", headers=A, json={
        "ci": "abc", "nombre": "X", "apellido": "Y", "email": "x@y.com",
        "fecha_nacimiento": "2003-04-05", "id_facultad": fac, "tipo": "grado"}), 400)
    chequear("planillero no ve jugadores (403)", api.get("/api/jugadores", headers=P), 403)
    local = [jugador() for _ in range(5)] + [jugador("docente"), jugador("funcionario")]
    visit = [jugador() for _ in range(6)]
    tercer_docente = jugador("docente")
    de_otra_facultad = jugador(facultad=otra_fac)

    # ---------- Equipos y planteles ----------
    def equipo(nombre):
        return chequear(f"crear equipo {nombre}", api.post("/api/equipos", headers=A, json={
            "nombre": f"{nombre} {sufijo}", "id_torneo": id_t, "id_facultad": fac, "ci_capitan": None}),
            201)["id_equipo"]

    e1, e2 = equipo("Locales"), equipo("Visitantes")
    for equipo_id, cis in ((e1, local), (e2, visit)):
        for n, ci in enumerate(cis, start=1):
            chequear(f"plantel {equipo_id} agrega #{n}", api.post(f"/api/equipos/{equipo_id}/plantel", headers=A,
                                                                 json={"ci_jugador": ci, "numero_camiseta": n}), 201)
    chequear("3er docente/funcionario (409)", api.post(f"/api/equipos/{e1}/plantel", headers=A,
                                                       json={"ci_jugador": tercer_docente, "numero_camiseta": 50}), 409)
    chequear("otra facultad (409)", api.post(f"/api/equipos/{e1}/plantel", headers=A,
                                             json={"ci_jugador": de_otra_facultad, "numero_camiseta": 51}), 409)
    chequear("jugador en dos equipos (409)", api.post(f"/api/equipos/{e2}/plantel", headers=A,
                                                      json={"ci_jugador": local[0], "numero_camiseta": 52}), 409)
    chequear("camiseta repetida (409)", api.put(f"/api/equipos/{e1}/plantel/{local[1]}", headers=A,
                                                json={"numero_camiseta": 1}), 409)
    chequear("capitán fuera del plantel (409)", api.put(f"/api/equipos/{e1}", headers=A,
                                                        json={"nombre": f"Locales {sufijo}", "ci_capitan": visit[0]}), 409)
    chequear("empezar sin capitanes (409)",
             api.patch(f"/api/torneos/{id_t}/estado", json={"estado": "en_curso"}, headers=A), 409)
    for equipo_id, cis, nombre in ((e1, local, "Locales"), (e2, visit, "Visitantes")):
        chequear(f"capitán {nombre}", api.put(f"/api/equipos/{equipo_id}", headers=A,
                                              json={"nombre": f"{nombre} {sufijo}", "ci_capitan": cis[0]}), 200)
    chequear("quitar al capitán (409)", api.delete(f"/api/equipos/{e1}/plantel/{local[0]}", headers=A), 409)
    chequear("torneo a en_curso",
             api.patch(f"/api/torneos/{id_t}/estado", json={"estado": "en_curso"}, headers=A), 200)
    chequear("plantel cerrado fuera de inscripción (409)", api.post(f"/api/equipos/{e1}/plantel", headers=A,
                                                                    json={"ci_jugador": tercer_docente, "numero_camiseta": 60}), 409)

    # ---------- Partidos ----------
    ayer = str(hoy - timedelta(days=1))
    p_body = {"id_torneo": id_t, "numero_fecha": 1, "id_equipo_local": e1, "id_equipo_visitante": e2,
              "dia": ayer, "id_turno": turnos[0]["id_turno"], "nombre_cancha": "Cancha 1", "id_complejo": id_c}
    chequear("contra sí mismo (409)", api.post("/api/partidos", headers=A,
                                               json={**p_body, "id_equipo_visitante": e1}), 409)
    chequear("fuera de fechas del torneo (409)", api.post("/api/partidos", headers=A,
                                                          json={**p_body, "dia": str(hoy + timedelta(days=60))}), 409)
    partido = chequear("programar partido", api.post("/api/partidos", headers=A, json=p_body), 201)
    id_p = partido["id_partido"]
    chequear("cruce repetido (409)", api.post("/api/partidos", headers=A,
                                              json={**p_body, "id_equipo_local": e2, "id_equipo_visitante": e1}), 409)
    chequear("achicar fechas del torneo dejando el partido afuera (409)", api.put(
        f"/api/torneos/{id_t}", headers=A, json={**t_body, "fecha_inicio": str(hoy)}), 409)
    chequear("planillero no posterga (409)",
             api.patch(f"/api/partidos/{id_p}/estado", json={"estado": "postergado"}, headers=P), 409)

    # ---------- Planilla, goles y tarjetas (planillero) ----------
    for ci in local[:5]:
        chequear("planilla local", api.post(f"/api/partidos/{id_p}/planilla", headers=P,
                                            json={"ci_jugador": ci, "id_equipo": e1}), 201)
    for ci in visit[:5]:
        chequear("planilla visitante", api.post(f"/api/partidos/{id_p}/planilla", headers=P,
                                                json={"ci_jugador": ci, "id_equipo": e2}), 201)
    chequear("jugador de otro equipo en la planilla (409)", api.post(
        f"/api/partidos/{id_p}/planilla", headers=P, json={"ci_jugador": local[5], "id_equipo": e2}), 409)
    for ci, minuto, autogol in ((local[1], 10, False), (local[1], 20, False), (visit[1], 30, False),
                                (visit[2], 40, True)):
        chequear("gol", api.post(f"/api/partidos/{id_p}/goles", headers=P,
                                 json={"ci_jugador": ci, "minuto": minuto, "autogol": autogol}), 201)
    chequear("gol de alguien fuera de la planilla (409)", api.post(
        f"/api/partidos/{id_p}/goles", headers=P, json={"ci_jugador": local[6], "minuto": 5}), 409)
    chequear("minuto 61 (400)", api.post(f"/api/partidos/{id_p}/goles", headers=P,
                                         json={"ci_jugador": local[1], "minuto": 61}), 400)
    chequear("roja", api.post(f"/api/partidos/{id_p}/tarjetas", headers=P,
                              json={"ci_jugador": visit[3], "minuto": 15, "color": "roja"}), 201)
    chequear("amarilla", api.post(f"/api/partidos/{id_p}/tarjetas", headers=P,
                                  json={"ci_jugador": local[2], "minuto": 25, "color": "amarilla"}), 201)
    chequear("quitar de la planilla a quien tiene goles (409)",
             api.delete(f"/api/partidos/{id_p}/planilla/{local[1]}", headers=P), 409)
    chequear("marcar jugado (planillero)",
             api.patch(f"/api/partidos/{id_p}/estado", json={"estado": "jugado"}, headers=P), 200)
    detalle = chequear("detalle del partido", api.get(f"/api/partidos/{id_p}", headers=P), 200)
    if (detalle["goles_local"], detalle["goles_visitante"]) != (3, 1):
        fallas.append("resultado calculado")
        print(f"MAL resultado: {detalle['goles_local']}-{detalle['goles_visitante']} (esperado 3-1, autogol al rival)")
    chequear("jugado no se reprograma (409)", api.put(f"/api/partidos/{id_p}", headers=A, json=p_body), 409)

    # ---------- Sanciones ----------
    sanciones = chequear("sanciones del torneo", api.get(f"/api/sanciones?torneo={id_t}", headers=A), 200)
    if not any(s["ci_jugador"] == visit[3] and s["motivo"] == "roja" for s in sanciones):
        print("AVISO la base no creó la sanción por roja (¿falta el trigger?)")
    chequear("sanción a quien no juega la edición (409)", api.post("/api/sanciones", headers=A, json={
        "ci_jugador": tercer_docente, "id_torneo": id_t, "motivo": "disciplinaria",
        "numero_fecha_inicio": 2, "cantidad_fechas": 1}), 409)
    chequear("sanción disciplinaria", api.post("/api/sanciones", headers=A, json={
        "ci_jugador": local[4], "id_torneo": id_t, "motivo": "disciplinaria",
        "numero_fecha_inicio": 2, "cantidad_fechas": 2}), 201)

    # ---------- Reportes ----------
    for r in ("posiciones", "goleadores", "fair-play", "promedio-goles", "canchas-turnos", "nunca-jugaron",
              "sanciones", "estado-partidos", "extra-1", "extra-2", "extra-3"):
        chequear(f"reporte {r}", api.get(f"/api/reportes/{r}?torneo={id_t}", headers=A), 200)
    chequear("reporte jugadores-facultad-tipo", api.get("/api/reportes/jugadores-facultad-tipo", headers=A), 200)
    chequear("planillero no ve reportes (403)", api.get(f"/api/reportes/posiciones?torneo={id_t}", headers=P), 403)
    pos = api.get(f"/api/reportes/posiciones?torneo={id_t}", headers=A).json()
    if [(f["id_equipo"], f["puntos"], f["dg"]) for f in pos] != [(e1, 3, 2), (e2, 0, -2)]:
        fallas.append("tabla de posiciones")
        print(f"MAL posiciones: {pos}")
    goleador = api.get(f"/api/reportes/goleadores?torneo={id_t}", headers=A).json()[0]
    if (goleador["ci"], goleador["goles"]) != (local[1], 2):
        fallas.append("goleadores")
        print(f"MAL goleadores: {goleador}")

    lv = {f["id_equipo"]: f for f in api.get(f"/api/reportes/extra-1?torneo={id_t}", headers=A).json()}
    if (lv[e1]["pj_local"], lv[e1]["pts_local"], lv[e1]["gf_local"], lv[e2]["pj_visitante"],
            lv[e2]["pts_visitante"], lv[e2]["gc_visitante"]) != (1, 3, 3, 1, 0, 3):  # 3-1 (incluye un autogol)
        fallas.append("extra-1 local vs visitante")
        print(f"MAL extra-1: {lv}")
    presencias = api.get(f"/api/reportes/extra-2?torneo={id_t}", headers=A).json()
    if not presencias or presencias[0]["partidos"] != 1 or presencias[0]["goles"] != 2:
        fallas.append("extra-2 presencias")
        print(f"MAL extra-2: {presencias[:3]}")
    rachas = {f["id_equipo"]: (f["mejor_racha"], f["racha_actual"])
              for f in api.get(f"/api/reportes/extra-3?torneo={id_t}", headers=A).json()}
    if (rachas[e1], rachas[e2]) != ((1, 1), (0, 0)):
        fallas.append("extra-3 rachas")
        print(f"MAL extra-3: {rachas}")

    chequear("torneo a finalizado",
             api.patch(f"/api/torneos/{id_t}/estado", json={"estado": "finalizado"}, headers=A), 200)

    print(f"\n{len(fallas)} fallas" + (": " + ", ".join(fallas) if fallas else " — todo bien"))
    sys.exit(1 if fallas else 0)


if __name__ == "__main__":
    main()
