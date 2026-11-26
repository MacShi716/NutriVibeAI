# -*- coding: utf-8 -*-
"""Vercel Hobby entry tests. They never call Zhipu and never need a real key."""
from __future__ import annotations

import base64
import importlib.util
import io
import json
import threading
import unittest
import urllib.error
import urllib.request
from http.client import HTTPMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

import index


ORIGIN = "https://macshi716.github.io"
_ENTRY = Path(__file__).resolve().parent / "api" / "index.py"


def _load_vercel():
    spec = importlib.util.spec_from_file_location("nutrivibeai_vercel_entry", _ENTRY)
    if spec is None or spec.loader is None:
        raise ImportError("Vercel entry api/index.py is missing")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


vercel = _load_vercel()


def _recipe_text():
    return json.dumps(
        {
            "recipes": [
                {
                    "title": "두부조림",
                    "description": "간단한 반찬입니다.",
                    "ingredients": [{"name": "두부", "amount": "200g"}],
                    "steps": ["두부를 굽습니다.", "양념에 조립니다."],
                    "cookMinutes": 15,
                    "servings": 2,
                    "nutrition": {"calories": 200, "protein": 12, "carbs": 8, "fat": 10},
                }
            ]
        },
        ensure_ascii=False,
    )


def _swap_text():
    return json.dumps(
        {
            "title": "계란볶음",
            "description": "간단한 반찬입니다.",
            "ingredients": [{"name": "달걀", "amount": "2개"}],
            "steps": ["달걀을 풉니다.", "팬에 볶습니다."],
            "cookMinutes": 10,
            "servings": 2,
            "nutrition": {"calories": 180, "protein": 12, "carbs": 2, "fat": 14},
        },
        ensure_ascii=False,
    )


def _conditions():
    return {"ingredients": "두부, 달걀", "servings": 2, "cookMinutes": 20}


class VercelEntryTests(unittest.TestCase):
    def setUp(self):
        index._hits.clear()
        self.environ = mock.patch.dict("os.environ", {"ZHIPU_API_KEY": ""}, clear=False)
        self.environ.start()

    def tearDown(self):
        self.environ.stop()
        index._hits.clear()

    def test_entry_is_base_http_handler(self):
        self.assertTrue(issubclass(vercel.handler, BaseHTTPRequestHandler))
        self.assertEqual(vercel.handler.__name__, "handler")

    def test_options_cors(self):
        status, headers, _ = invoke("OPTIONS")
        self.assertEqual(status, 204)
        self.assertEqual(headers.get("access-control-allow-origin"), ORIGIN)
        self.assertIn("POST", headers.get("access-control-allow-methods", ""))

    def test_options_rejects_other_origin(self):
        status, headers, _ = invoke("OPTIONS", origin="https://evil.example")
        self.assertEqual(status, 403)
        self.assertNotIn("access-control-allow-origin", headers)

    def test_post_without_origin_is_rejected(self):
        status, headers, data = invoke("POST", include_origin=False, body={"task": "recipes"})
        self.assertEqual(status, 403)
        self.assertEqual(data["error"], "origin_not_allowed")
        self.assertNotIn("access-control-allow-origin", headers)

    def test_get_forbidden(self):
        status, _, data = invoke("GET")
        self.assertEqual(status, 403)
        self.assertEqual(data["error"], "method_not_allowed")

    def test_put_forbidden(self):
        status, _, data = invoke("PUT", body={"task": "recipes"})
        self.assertEqual(status, 403)
        self.assertEqual(data["error"], "method_not_allowed")

    def test_missing_key_is_not_configured(self):
        status, headers, data = invoke(
            body={"task": "recipes", "ingredients": "두부, 달걀", "servings": 2, "cookMinutes": 20}
        )
        self.assertEqual(status, 503)
        self.assertEqual(data["error"], "not_configured")
        self.assertIn("json", headers.get("content-type", ""))
        blob = json.dumps(data)
        self.assertNotIn("ZHIPU", blob)
        self.assertNotIn("api_key", blob.lower())

    def test_ask_is_not_a_task(self):
        status, _, data = invoke(body={"task": "ask", "question": "hi"})
        self.assertEqual(status, 400)
        self.assertEqual(data["error"], "bad_request")

    def test_task_routing(self):
        image = "data:image/png;base64," + base64.b64encode(b"png").decode("ascii")
        cases = (
            (
                {"task": "recipes", "ingredients": "두부", "servings": 2, "cookMinutes": 20},
                _recipe_text(),
                [index.TEXT_MODEL, index.TEXT_FALLBACK],
                lambda data: data["recipes"][0]["title"] == "두부조림" and data["provider"] == "zhipu",
            ),
            (
                {"task": "meal_plan", "startDate": "2026-11-23", "conditions": _conditions(), "pinned": []},
                json.dumps({"days": [{"date": "2026-11-23", "meals": []}]}, ensure_ascii=False),
                [index.TEXT_MODEL, index.TEXT_FALLBACK],
                lambda data: data["provider"] == "zhipu" and "days" in data["text"],
            ),
            (
                {"task": "swap", "slot": "lunch", "avoidTitles": [], "conditions": _conditions()},
                _swap_text(),
                [index.TEXT_MODEL, index.TEXT_FALLBACK],
                lambda data: data["recipe"]["title"] == "계란볶음" and data["provider"] == "zhipu",
            ),
            (
                {"task": "vision", "image": image, "restrictions": ""},
                json.dumps({"ingredients": ["두부"]}, ensure_ascii=False),
                [index.VISION_MODEL],
                lambda data: data["ingredients"] == ["두부"] and data["provider"] == "zhipu" and data["demo"] is False,
            ),
        )
        for body, text, models, check in cases:
            with self.subTest(task=body["task"]):
                index._hits.clear()
                seen = {}

                def fake_chat(messages, model_list, max_tokens, temperature, text=text, models=models):
                    seen["models"] = list(model_list)
                    return text, None

                with mock.patch.dict("os.environ", {"ZHIPU_API_KEY": "dummy-key"}):
                    with mock.patch.object(index, "_chat", side_effect=fake_chat):
                        status, _, data = invoke(body=body)
                self.assertEqual(status, 200, data)
                self.assertEqual(seen["models"], models)
                self.assertTrue(check(data), data)
                self.assertNotIn("dummy-key", json.dumps(data))

    def test_rate_limit_uses_fc_limiter(self):
        body = {"task": "recipes", "ingredients": "두부", "servings": 2, "cookMinutes": 20}
        last = None
        for _ in range(index.RATE_LIMIT + 1):
            last = invoke(body=body, ip="198.51.100.20")
        self.assertEqual(last[0], 429)
        self.assertEqual(last[2]["error"], "rate_limited")

    def test_socket_options_and_missing_key(self):
        # Drive the real BaseHTTPRequestHandler constructor, not a hand-built stub.
        server = ThreadingHTTPServer(("127.0.0.1", 0), vercel.handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        host, port = server.server_address
        url = "http://%s:%s/api" % (host, port)
        try:
            preflight = urllib.request.Request(url, method="OPTIONS", headers={"Origin": ORIGIN})
            with urllib.request.urlopen(preflight, timeout=5) as response:
                self.assertEqual(response.status, 204)
                self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), ORIGIN)
            raw = json.dumps(
                {"task": "recipes", "ingredients": "두부", "servings": 2, "cookMinutes": 20},
                ensure_ascii=False,
            ).encode("utf-8")
            posted = urllib.request.Request(
                url,
                data=raw,
                method="POST",
                headers={"Origin": ORIGIN, "Content-Type": "application/json"},
            )
            with self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(posted, timeout=5)
            self.assertEqual(caught.exception.code, 503)
            data = json.loads(caught.exception.read().decode("utf-8"))
            self.assertEqual(data["error"], "not_configured")
            self.assertEqual(caught.exception.headers.get("Access-Control-Allow-Origin"), ORIGIN)
        finally:
            server.shutdown()
            server.server_close()

    def test_payload_too_large(self):
        status, _, data = invoke(raw_body=b"x" * (index.MAX_BODY_BYTES + 1))
        self.assertEqual(status, 413)
        self.assertEqual(data["error"], "payload_too_large")


def invoke(method="POST", origin=ORIGIN, body=None, ip="203.0.113.10", raw_body=None, include_origin=True):
    if raw_body is None:
        raw = b"" if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    else:
        raw = raw_body
    headers = HTTPMessage()
    headers["Content-Type"] = "application/json"
    headers["Content-Length"] = str(len(raw))
    headers["X-Forwarded-For"] = ip
    if include_origin:
        headers["Origin"] = origin

    class _Request(vercel.handler):
        def __init__(self):
            self.rfile = io.BytesIO(raw)
            self.wfile = io.BytesIO()
            self.command = method
            self.path = "/api"
            self.request_version = "HTTP/1.1"
            self.headers = headers
            self.client_address = (ip, 0)
            self.requestline = "%s /api HTTP/1.1" % method
            self.close_connection = True

    request = _Request()
    dispatch = getattr(request, "do_" + method)
    dispatch()
    return _parse(request.wfile.getvalue())


def _parse(raw):
    head, _, body = raw.partition(b"\r\n\r\n")
    lines = head.decode("iso-8859-1").split("\r\n")
    status = int(lines[0].split(" ", 2)[1])
    headers = {}
    for line in lines[1:]:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        headers[key.strip().lower()] = value.strip()
    payload = body.decode("utf-8") if body else ""
    data = json.loads(payload) if payload else None
    return status, headers, data


if __name__ == "__main__":
    unittest.main()
