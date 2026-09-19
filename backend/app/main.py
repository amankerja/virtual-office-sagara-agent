import logging
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from contextlib import asynccontextmanager
from app.api.errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_error_handler,
)
from app.api.v1.router import api_v1_router
from app.config import settings

# Structured logging setup
class CorrelationIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "correlation_id"):
            record.correlation_id = "-"
        return True


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [corr=%(correlation_id)s] %(message)s",
)
for h in logging.root.handlers:
    h.addFilter(CorrelationIdFilter())
logger = logging.getLogger("mission_control")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.api.dependencies import get_realtime_manager, get_realtime_sampler

    sampler = get_realtime_sampler()
    manager = get_realtime_manager()

    if settings.realtime_enabled:
        sampler.start()
        logger.info("Realtime layer enabled: sampler started")

    yield

    if settings.realtime_enabled:
        await sampler.stop()
    await manager.close_all()
    logger.info("Realtime layer shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sagara Mission Control API",
        version="1.0.0",
        description="Canonical API Foundation for Sagara Mission Control.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["ETag", "X-Correlation-ID", "Idempotency-Key"],
    )

    # Compression middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Correlation ID and Request Timing Middleware
    @app.middleware("http")
    async def correlation_and_logging_middleware(request: Request, call_next):
        corr_id = request.headers.get("X-Correlation-ID")
        if not corr_id or len(corr_id) < 4 or len(corr_id) > 64:
            corr_id = f"corr-{uuid.uuid4().hex[:12]}"

        request.state.correlation_id = corr_id
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        response.headers["X-Correlation-ID"] = corr_id

        # Sane local and ingress security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        # HSTS enforcement when proxied over HTTPS
        if request.headers.get("x-forwarded-proto") == "https" or request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.2f}ms)",
            extra={"correlation_id": corr_id},
        )
        return response

    # Exception Handlers
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # Root Health & Readiness Endpoints
    @app.get("/health", tags=["Operational"])
    @app.get("/api/v1/health", tags=["Operational"])
    async def health_check():
        return {"status": "ok"}

    @app.get("/ready", tags=["Operational"])
    async def readiness_check():
        # Validate configured Sagara sources if active (Section 33)
        if settings.profile_source == "sagara" or settings.skill_source == "sagara":
            from app.adapters.sagara_profiles import validate_sagara_project_root
            validate_sagara_project_root(settings.sagara_project_root)

        return {
            "status": "ok",
            "data_mode": settings.data_mode,
            "environment": settings.environment,
            "sources": {
                "profile": settings.profile_source,
                "skill": settings.skill_source,
                "runtime": settings.runtime_source,
            },
        }


    # Mount API V1
    app.include_router(api_v1_router)

    # Mount Pre-built Frontend SPA (Same-Origin Serving per Prompt 15.2 Section 5, 14, 15)
    from pathlib import Path
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    dist_path = None
    if settings.frontend_dist_path:
        candidate = Path(settings.frontend_dist_path).resolve()
        if candidate.is_dir():
            dist_path = candidate
    else:
        candidate = (Path(__file__).resolve().parent.parent.parent / "frontend" / "dist").resolve()
        if candidate.is_dir():
            dist_path = candidate

    if dist_path and (dist_path / "index.html").is_file():
        assets_dir = dist_path / "assets"
        if assets_dir.is_dir():
            class CachedStaticFiles(StaticFiles):
                async def get_response(self, path: str, scope):
                    response = await super().get_response(path, scope)
                    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
                    return response

            app.mount("/assets", CachedStaticFiles(directory=str(assets_dir)), name="frontend_assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str):
            if full_path.startswith(("api", "docs", "redoc", "openapi.json", "health", "ready")):
                raise StarletteHTTPException(status_code=404, detail="Not Found")
            target = dist_path / full_path
            if target.is_file() and not full_path.endswith(".html"):
                res = FileResponse(target)
                res.headers["Cache-Control"] = "public, max-age=86400"
                return res
            res = FileResponse(dist_path / "index.html")
            res.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            return res

    return app


app = create_app()
