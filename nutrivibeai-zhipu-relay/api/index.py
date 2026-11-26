# -*- coding: utf-8 -*-
"""Vercel Hobby HTTP entry for the NutriVibe Zhipu relay.

Vercel file functions under ``api/`` load a ``BaseHTTPRequestHandler`` subclass
named ``handler``. This adapter turns that HTTP request into the event shape
used by Aliyun Function Compute and calls ``index.handler``. CORS, rate
limits, and task routing stay in the Function Compute module.
"""
from __future__ import annotations

import importlib.util
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path


def _fc_path() -> Path:
    here = Path(__file__).resolve()
    candidates = (
        here.parent.parent / "index.py",
        Path.cwd() / "index.py",
    )
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved.is_file() and resolved != here:
            return resolved
    raise RuntimeError("Function Compute handler index.py is not available to the Vercel entry")


def _load_fc_module():
    fc_path = _fc_path()
    existing = sys.modules.get("index")
    existing_file = getattr(existing, "__file__", None) if existing is not None else None
    if existing_file and Path(existing_file).resolve() == fc_path:
        return existing
    spec = importlib.util.spec_from_file_location("nutrivibeai_fc_index", fc_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the Function Compute handler")
    module = importlib.util.module_from_spec(spec)
    sys.modules["nutrivibeai_fc_index"] = module
    spec.loader.exec_module(module)
    return module


_fc = _load_fc_module()


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._dispatch()

    def do_POST(self):
        self._dispatch()

    def do_OPTIONS(self):
        self._dispatch()

    def do_PUT(self):
        self._dispatch()

    def do_DELETE(self):
        self._dispatch()

    def do_PATCH(self):
        self._dispatch()

    def do_HEAD(self):
        self._dispatch()

    def log_message(self, fmt, *args):
        # Vercel's wrapper logs the request line. Do not log bodies or keys here.
        return

    def _dispatch(self):
        length = _content_length(self.headers)
        body = self.rfile.read(length) if length else b""
        result = _fc.handler(_event(self, body), None)
        _write(self, result)


def _content_length(headers) -> int:
    raw = headers.get("Content-Length") if headers is not None else None
    try:
        length = int(raw) if raw else 0
    except (TypeError, ValueError):
        return 0
    if length < 0:
        return 0
    return length


def _source_ip(request: BaseHTTPRequestHandler) -> str:
    client = request.client_address
    if isinstance(client, tuple) and client:
        return str(client[0])
    if isinstance(client, str) and client:
        return client
    return "unknown"


def _header_map(request: BaseHTTPRequestHandler) -> dict:
    headers = {}
    for key, value in request.headers.items():
        headers[str(key)] = value if isinstance(value, str) else str(value)
    return headers


def _event(request: BaseHTTPRequestHandler, body: bytes) -> dict:
    return {
        "requestContext": {
            "http": {
                "method": request.command,
                "sourceIp": _source_ip(request),
                "path": request.path,
            }
        },
        "headers": _header_map(request),
        "body": body,
        "isBase64Encoded": False,
    }


def _write(request: BaseHTTPRequestHandler, result) -> None:
    if not isinstance(result, dict):
        result = {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json; charset=utf-8"},
            "body": '{"error":"upstream"}',
        }
    status = int(result.get("statusCode") or 500)
    headers = result.get("headers") or {}
    raw = result.get("body") or ""
    if isinstance(raw, (bytes, bytearray)):
        payload = bytes(raw)
    else:
        payload = str(raw).encode("utf-8")
    request.send_response(status)
    saw_length = False
    if isinstance(headers, dict):
        for key, value in headers.items():
            if str(key).lower() == "content-length":
                saw_length = True
            request.send_header(str(key), str(value))
    if not saw_length:
        request.send_header("Content-Length", str(len(payload)))
    request.end_headers()
    if request.command != "HEAD":
        request.wfile.write(payload)
