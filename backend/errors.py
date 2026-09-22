"""Consistent public error responses for the HTTP boundary."""

import logging
from typing import Any, Dict

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("hanafuda.errors")


def _body(detail: Any, code: str) -> Dict[str, Any]:
    return {"detail": detail, "code": code}


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code = "http_error" if exc.status_code < 500 else "server_error"
    return JSONResponse(status_code=exc.status_code, content=_body(exc.detail, code), headers=exc.headers)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content=_body(exc.errors(), "validation_error"))


async def unexpected_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled backend exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content=_body("サーバーで予期しないエラーが発生しました。", "internal_error"),
    )


def register_exception_handlers(app: Any) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unexpected_exception_handler)
