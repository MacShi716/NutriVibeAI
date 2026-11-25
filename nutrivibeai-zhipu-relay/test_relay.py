# -*- coding: utf-8 -*-
"""Handler tests that never call the upstream API and never need a key."""
from __future__ import annotations

import base64
import json
import unittest
from unittest import mock

import index


ORIGIN = "https://macshi716.github.io"


def event(method="POST", origin=ORIGIN, body=None, ip="203.0.113.10"):
    raw = "" if body is None else json.dumps(body, ensure_ascii=False)
    return {
        "requestContext": {"http": {"method": method, "sourceIp": ip}},
        "headers": {"Origin": origin, "Content-Type": "application/json"},
        "body": raw,
        "isBase64Encoded": False,
    }


def call(evt):
    result = index.handler(evt, None)
    payload = result.get("body") or ""
    data = json.loads(payload) if payload else None
    return result["statusCode"], result.get("headers") or {}, data


class RelayTests(unittest.TestCase):
    def setUp(self):
        index._hits.clear()
        self.environ = mock.patch.dict("os.environ", {"ZHIPU_API_KEY": ""}, clear=False)
        self.environ.start()

    def tearDown(self):
        self.environ.stop()
        index._hits.clear()

    def test_options_cors(self):
        status, headers, _ = call(event("OPTIONS"))
        self.assertEqual(status, 204)
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), ORIGIN)

    def test_options_rejects_other_origin(self):
        status, headers, _ = call(event("OPTIONS", origin="https://evil.example"))
        self.assertEqual(status, 403)
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_localhost_origin_allowed(self):
        status, headers, data = call(event(origin="http://localhost:3000", body={"task": "recipes"}))
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), "http://localhost:3000")
        self.assertEqual(status, 400)
        self.assertEqual(data["error"], "bad_request")

    def test_loopback_origin_allowed(self):
        status, headers, _ = call(event(origin="http://127.0.0.1:4173", body={"task": "recipes", "ingredients": "두부", "servings": 2, "cookMinutes": 20}))
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:4173")
        self.assertEqual(status, 503)

    def test_rejects_github_io_path_as_origin(self):
        # Origins never include a path; a spoofed value must not pass.
        status, headers, _ = call(event(origin="https://macshi716.github.io/NutriVibeAI", body={"task": "recipes"}))
        self.assertEqual(status, 403)
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_rejects_disallowed_origin_on_post(self):
        status, _, data = call(event(origin="https://example.com", body={"task": "recipes"}))
        self.assertEqual(status, 403)
        self.assertEqual(data["error"], "origin_not_allowed")

    def test_get_forbidden(self):
        status, _, data = call(event("GET"))
        self.assertEqual(status, 403)
        self.assertEqual(data["error"], "method_not_allowed")

    def test_bad_json(self):
        evt = event()
        evt["body"] = "{not-json"
        status, _, data = call(evt)
        self.assertEqual(status, 400)
        self.assertEqual(data["error"], "bad_request")

    def test_unknown_task(self):
        status, _, data = call(event(body={"task": "ask", "question": "hi"}))
        self.assertEqual(status, 400)
        self.assertEqual(data["error"], "bad_request")

    def test_missing_key_is_not_configured(self):
        status, _, data = call(event(body={"task": "recipes", "ingredients": "두부, 달걀", "servings": 2, "cookMinutes": 20}))
        self.assertEqual(status, 503)
        self.assertEqual(data["error"], "not_configured")
        self.assertNotIn("ZHIPU", json.dumps(data))

    def test_payload_too_large(self):
        evt = event()
        evt["body"] = "x" * (index.MAX_BODY_BYTES + 1)
        status, _, data = call(evt)
        self.assertEqual(status, 413)
        self.assertEqual(data["error"], "payload_too_large")

    def test_rate_limit(self):
        body = {"task": "recipes", "ingredients": "두부", "servings": 2, "cookMinutes": 20}
        last = None
        for i in range(index.RATE_LIMIT + 1):
            last = call(event(body=body, ip="198.51.100.7"))
        self.assertEqual(last[0], 429)
        self.assertEqual(last[2]["error"], "rate_limited")

    def test_vision_rejects_oversize_image(self):
        big = base64.b64encode(b"\x00" * (index.MAX_IMAGE_BYTES + 1)).decode("ascii")
        status, _, data = call(event(body={"task": "vision", "image": "data:image/jpeg;base64," + big}))
        self.assertEqual(status, 400)
        self.assertEqual(data["error"], "bad_request")

    def test_vision_rejects_svg(self):
        svg = base64.b64encode(b"<svg xmlns='http://www.w3.org/2000/svg'></svg>").decode("ascii")
        status, _, data = call(event(body={"task": "vision", "mimeType": "image/svg+xml", "image": svg}))
        self.assertEqual(status, 400)

    def test_chat_does_not_forward_upstream_body(self):
        class FakeError(Exception):
            code = 500
            def read(self):
                return b'{"error":{"message":"secret-upstream-trace"}}'

        def fake_urlopen(*args, **kwargs):
            raise index.urllib.error.HTTPError(
                url="https://open.bigmodel.cn/api/paas/v4/chat/completions",
                code=500,
                msg="err",
                hdrs=None,
                fp=__import__("io").BytesIO(b'{"error":{"message":"secret-upstream-trace"}}'),
            )

        with mock.patch.dict("os.environ", {"ZHIPU_API_KEY": "dummy-key"}):
            with mock.patch("index.urllib.request.urlopen", side_effect=fake_urlopen):
                status, _, data = call(event(body={
                    "task": "recipes",
                    "ingredients": "두부, 달걀",
                    "servings": 2,
                    "cookMinutes": 20,
                }))
        self.assertEqual(status, 502)
        self.assertEqual(data, {"error": "upstream"})
        blob = json.dumps(data)
        self.assertNotIn("secret-upstream-trace", blob)
        self.assertNotIn("dummy-key", blob)

    def test_successful_recipes_uses_primary_then_parses(self):
        payload = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "recipes": [{
                            "title": "두부조림",
                            "description": "간단한 반찬입니다.",
                            "ingredients": [{"name": "두부", "amount": "200g"}],
                            "steps": ["두부를 굽습니다.", "양념에 조립니다."],
                            "cookMinutes": 15,
                            "servings": 2,
                            "nutrition": {"calories": 200, "protein": 12, "carbs": 8, "fat": 10},
                        }]
                    }, ensure_ascii=False)
                }
            }]
        }

        class FakeResp:
            def read(self):
                return json.dumps(payload).encode("utf-8")
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False

        with mock.patch.dict("os.environ", {"ZHIPU_API_KEY": "dummy-key"}):
            with mock.patch("index.urllib.request.urlopen", return_value=FakeResp()):
                status, _, data = call(event(body={
                    "task": "recipes",
                    "ingredients": "두부",
                    "servings": 2,
                    "cookMinutes": 20,
                }))
        self.assertEqual(status, 200)
        self.assertEqual(data["provider"], "zhipu")
        self.assertEqual(data["recipes"][0]["title"], "두부조림")
        self.assertFalse(data["usedMock"])


if __name__ == "__main__":
    unittest.main()
