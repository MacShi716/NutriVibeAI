# -*- coding: utf-8 -*-
"""Local HTTP wrapper around the FC 3.0 handler. For development only."""
from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from index import handler


def _event(handler: BaseHTTPRequestHandler, body: bytes) -> dict:
    headers = {k: v for k, v in handler.headers.items()}
    parsed = urlparse(handler.path)
    return {
        "requestContext": {
            "http": {
                "method": handler.command,
                "sourceIp": handler.client_address[0],
                "path": parsed.path,
            }
        },
        "headers": headers,
        "body": body.decode("utf-8") if body else "",
        "isBase64Encoded": False,
    }


class RelayHandler(BaseHTTPRequestHandler):
    def _dispatch(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length > 0 else b""
        result = handler(_event(self, body), None)
        status = int(result.get("statusCode") or 500)
        headers = result.get("headers") or {}
        raw = result.get("body") or ""
        if not isinstance(raw, (bytes, bytearray)):
            raw = str(raw).encode("utf-8")
        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(raw)

    def do_OPTIONS(self):
        self._dispatch()

    def do_POST(self):
        self._dispatch()

    def do_GET(self):
        self._dispatch()

    def log_message(self, format, *args):
        # Do not log request bodies or secrets.
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("%s - %s\n" % (self.address_string(), format % args))


def main():
    import os

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT") or 8787)
    server = ThreadingHTTPServer((host, port), RelayHandler)
    print("nutrivibeai-zhipu-relay listening on http://%s:%s" % (host, port))
    server.serve_forever()


if __name__ == "__main__":
    main()
