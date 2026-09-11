from typing import Any, Optional
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details
        self.correlation_id = correlation_id


class ResourceNotFoundError(AppError):
    def __init__(self, message: str, details: Optional[dict[str, Any]] = None, correlation_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="RESOURCE_NOT_FOUND",
            message=message,
            details=details,
            correlation_id=correlation_id,
        )


class ConflictError(AppError):
    def __init__(
        self,
        code: str = "RESOURCE_CONFLICT",
        message: str = "Resource conflict occurred.",
        details: Optional[dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            code=code,
            message=message,
            details=details,
            correlation_id=correlation_id,
        )


class BadRequestError(AppError):
    def __init__(
        self,
        code: str = "BAD_REQUEST",
        message: str = "Bad request.",
        details: Optional[dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=code,
            message=message,
            details=details,
            correlation_id=correlation_id,
        )


class SagaraSourceUnavailableError(AppError):
    def __init__(
        self,
        message: str = "Configured Sagara source is unavailable.",
        details: Optional[dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="SAGARA_SOURCE_UNAVAILABLE",
            message=message,
            details=details,
            correlation_id=correlation_id,
        )


class RuntimeUnavailableError(AppError):
    def __init__(
        self,
        message: str = "Configured runtime source is unavailable.",
        details: Optional[dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="RUNTIME_UNAVAILABLE",
            message=message,
            details=details,
            correlation_id=correlation_id,
        )


class HermesSchemaUnsupportedError(AppError):
    def __init__(
        self,
        message: str = "Hermes database schema is unsupported or incompatible.",
        details: Optional[dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="HERMES_SCHEMA_UNSUPPORTED",
            message=message,
            details=details,
            correlation_id=correlation_id,
        )




def create_error_response(
    status_code: int,
    code: str,
    message: str,
    correlation_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
) -> JSONResponse:
    payload = {
        "error": {
            "code": code,
            "message": message,
            "correlation_id": correlation_id,
            "details": details,
        }
    }
    return JSONResponse(status_code=status_code, content=payload)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    corr_id = exc.correlation_id or getattr(request.state, "correlation_id", None)
    return create_error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        correlation_id=corr_id,
        details=exc.details,
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    corr_id = getattr(request.state, "correlation_id", None)
    # Convert validation errors to safe structure without leaking sensitive internals
    err_details = {"errors": [err["msg"] for err in exc.errors()]}
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="VALIDATION_ERROR",
        message="Request payload failed schema validation.",
        correlation_id=corr_id,
        details=err_details,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    corr_id = getattr(request.state, "correlation_id", None)
    code_map = {
        404: "RESOURCE_NOT_FOUND",
        400: "BAD_REQUEST",
        409: "RESOURCE_CONFLICT",
        403: "FORBIDDEN",
        401: "UNAUTHORIZED",
        503: "RUNTIME_UNAVAILABLE",
    }
    code = code_map.get(exc.status_code, "INTERNAL_ERROR")
    return create_error_response(
        status_code=exc.status_code,
        code=code,
        message=str(exc.detail),
        correlation_id=corr_id,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    corr_id = getattr(request.state, "correlation_id", None)
    # Strictly hide internal tracebacks/paths from response
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_ERROR",
        message="An unexpected internal server error occurred.",
        correlation_id=corr_id,
    )
