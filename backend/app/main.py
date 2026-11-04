from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .errores import registrar_manejadores
from .routers import (auth, catalogos, complejos, equipos, jugadores, partidos, planillas, reportes,
                      sanciones, torneos)

app = FastAPI(title="Torneo Interfacultades Fútbol 5 - API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

registrar_manejadores(app)

for r in (auth.router, catalogos.router, torneos.router, jugadores.router, equipos.router,
          complejos.router, partidos.router, planillas.router, sanciones.router,
          reportes.router):
    app.include_router(r, prefix="/api")


@app.get("/api/salud")
def salud():
    return {"ok": True}
