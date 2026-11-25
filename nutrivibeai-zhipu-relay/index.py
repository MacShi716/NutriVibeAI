# -*- coding: utf-8 -*-
"""NutriVibe AI Zhipu (GLM) relay for Aliyun Function Compute 3.0 HTTP trigger.

The API key is read only from the server environment variable ZHIPU_API_KEY.
Never log the key or return upstream error bodies to the browser.
This relay is dedicated to NutriVibe; do not reuse other products' endpoints.
"""
from __future__ import annotations

import base64
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
TEXT_MODEL = "glm-4-flash-250414"
TEXT_FALLBACK = "glm-4-flash"
VISION_MODEL = "glm-4v-flash"

ALLOWED_ORIGINS = {"https://macshi716.github.io"}
LOCAL_HOSTS = {"localhost", "127.0.0.1"}

UPSTREAM_TIMEOUT = 60
MAX_BODY_BYTES = 6 * 1024 * 1024
MAX_IMAGE_BYTES = 4 * 1024 * 1024
MAX_FIELD = {
    "ingredients": 2000,
    "preferences": 500,
    "restrictions": 500,
}
MAX_PROMPT_CHARS = 8000
MAX_PINNED = 21
MAX_AVOID = 40
MAX_EXPIRING = 40
MAX_INGREDIENT_NAME = 40

RATE_LIMIT = 12
RATE_WINDOW_S = 60
VISION_RATE_LIMIT = 6

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

SYSTEM_RECIPE = (
    "당신은 NutriVibe의 한국 가정식 레시피 도우미입니다. "
    "항상 정중한 높임말로 답하십시오. "
    "사용자가 제공한 기피 및 알레르기 식재료(메밀을 포함한 모든 명시 항목)는 어떤 경우에도 사용하지 마십시오. "
    "사용자가 명시하지 않은 알레르기를 임의로 기본 적용하지 마십시오. "
    "보유 식재료를 우선 활용한 한국 가정식을 제안하십시오. "
    "영양 수치는 참고용 추정치일 뿐이며, 의료적 진단, 치료, 처방이나 질병 조언을 하지 마십시오. "
    "건강 관련 안내는 필요 시 의료 전문가와 상담하라는 짧은 면책만 하십시오. "
    "지정된 JSON만 출력하고, JSON 밖의 설명이나 마크다운 코드 블록은 넣지 마십시오."
)

SYSTEM_VISION = (
    "당신은 NutriVibe의 식재료 인식 도우미입니다. "
    "사진에 실제로 보이는 식재료만 한국어 일반 명칭으로 식별하십시오. "
    "의학적 진단이나 식품 안전 판정을 하지 마십시오. "
    "사용자가 기피 또는 알레르기로 명시한 재료는 목록에 넣지 마십시오. "
    "명시되지 않은 알레르기를 임의로 적용하지 마십시오. "
    '반드시 {"ingredients":["재료명"]} 형식의 JSON만 출력하십시오. '
    '식재료가 없으면 {"ingredients":[]}를 출력하십시오.'
)

_hits: dict[str, list[float]] = defaultdict(list)


def _parse_event(event):
    if isinstance(event, (bytes, bytearray)):
        event = event.decode("utf-8")
    if isinstance(event, str):
        event = json.loads(event)
    return event or {}


def _method(evt):
    http = (evt.get("requestContext") or {}).get("http") or {}
    return str(http.get("method") or evt.get("httpMethod") or "").upper()


def _headers(evt):
    raw = evt.get("headers") or {}
    return {str(k).lower(): v for k, v in raw.items()}


def _origin(evt):
    return str(_headers(evt).get("origin") or "")


def _client_ip(evt):
    headers = _headers(evt)
    forwarded = str(headers.get("x-forwarded-for") or "").split(",")[0].strip()
    if forwarded:
        return forwarded[:80]
    http = (evt.get("requestContext") or {}).get("http") or {}
    source = http.get("sourceIp") or evt.get("sourceIp") or headers.get("x-real-ip") or "unknown"
    return str(source)[:80]


def _body_raw(evt):
    raw = evt.get("body")
    if raw is None:
        return b""
    if isinstance(raw, (bytes, bytearray)):
        data = bytes(raw)
    else:
        data = str(raw).encode("utf-8")
    if evt.get("isBase64Encoded") and data:
        try:
            data = base64.b64decode(data)
        except Exception:
            return None
    return data


def _origin_allowed(origin):
    if origin in ALLOWED_ORIGINS:
        return True
    try:
        parsed = urllib.parse.urlparse(origin)
    except Exception:
        return False
    if parsed.scheme != "http" or parsed.hostname not in LOCAL_HOSTS:
        return False
    if parsed.path not in ("", "/") or parsed.params or parsed.query or parsed.fragment or parsed.username:
        return False
    return True


def _cors(origin):
    headers = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": "inline",
    }
    if _origin_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Vary"] = "Origin"
    return headers


def _resp(status, origin, payload):
    return {
        "statusCode": status,
        "headers": _cors(origin),
        "isBase64Encoded": False,
        "body": json.dumps(payload, ensure_ascii=False),
    }


def _rate_limited(ip, limit):
    now = time.time()
    window = _hits[ip]
    _hits[ip] = [t for t in window if now - t < RATE_WINDOW_S]
    if len(_hits[ip]) >= limit:
        return True
    _hits[ip].append(now)
    if len(_hits) > 5000:
        _hits.clear()
    return False


def _clip(value, limit):
    text = value if isinstance(value, str) else ""
    return text.strip()[:limit]


def _read_conditions(data):
    raw = data.get("conditions") if isinstance(data.get("conditions"), dict) else data
    if not isinstance(raw, dict):
        return None
    try:
        servings = int(raw.get("servings") or 0)
        cook = int(raw.get("cookMinutes") or 0)
    except (TypeError, ValueError):
        return None
    if servings < 1 or servings > 12 or cook < 5 or cook > 180:
        return None

    def optional_goal(value, lo, hi):
        if value is None or value == "":
            return None
        try:
            number = int(value)
        except (TypeError, ValueError):
            return False
        if number < lo or number > hi:
            return False
        return number

    calories = optional_goal(raw.get("goalCalories"), 500, 8000)
    protein = optional_goal(raw.get("goalProtein"), 1, 400)
    if calories is False or protein is False:
        return None

    expiring = raw.get("expiringIngredients")
    if data.get("expiringIngredients") is not None:
        expiring = data.get("expiringIngredients")
    names = []
    if isinstance(expiring, list):
        for item in expiring:
            if isinstance(item, str):
                name = item.strip()[:MAX_INGREDIENT_NAME]
                if name:
                    names.append(name)
            if len(names) >= MAX_EXPIRING:
                break

    conditions = {
        "ingredients": _clip(raw.get("ingredients"), MAX_FIELD["ingredients"]),
        "preferences": _clip(raw.get("preferences"), MAX_FIELD["preferences"]),
        "restrictions": _clip(raw.get("restrictions"), MAX_FIELD["restrictions"]),
        "servings": servings,
        "cookMinutes": cook,
        "goalCalories": calories,
        "goalProtein": protein,
        "prioritizeExpiring": raw.get("prioritizeExpiring") is True,
        "expiringIngredients": names,
    }
    total = len(conditions["ingredients"]) + len(conditions["preferences"]) + len(conditions["restrictions"])
    if total > MAX_PROMPT_CHARS:
        return None
    return conditions


def _slot_label(slot):
    return {"breakfast": "아침", "lunch": "점심", "dinner": "저녁"}.get(slot, slot)


def _slot_share(slot):
    return {"breakfast": 0.25, "lunch": 0.35, "dinner": 0.4}.get(slot, 0.33)


def _build_recipe_prompt(c):
    lines = [
        "아래 조건을 바탕으로 2~3개의 한국 가정식 레시피를 JSON으로 생성하십시오.",
        f"- 보유 식재료: {c['ingredients'] or '없음'}",
        f"- 식사 인원: {c['servings']}명",
        f"- 조리 시간: {c['cookMinutes']}분 이내",
    ]
    if c["goalCalories"]:
        lines.append(f"- 목표 일일 열량: {c['goalCalories']} kcal (이 끼니는 하루 권장 열량의 약 30% 수준)")
    if c["goalProtein"]:
        lines.append(f"- 목표 일일 단백질: {c['goalProtein']} g (이 끼니는 하루 목표의 약 30% 수준)")
    if c["prioritizeExpiring"]:
        lines.append("- 목록 앞쪽의 식재료는 유통기한이 가까우므로 그 재료를 우선 사용하십시오.")
    lines.extend(
        [
            f"- 식습관 및 선호: {c['preferences'] or '제한 없음'}",
            f"- 기피 및 알레르기: {c['restrictions'] or '없음'}",
            "- 보유 식재료를 최우선으로 활용하고, 제한 식재료는 사용하지 마십시오.",
            "- 최상위는 반드시 recipes 배열을 가진 JSON 객체여야 합니다. 배열만 출력하지 마십시오.",
            '{"recipes":[{"title":"레시피명","description":"한 줄 설명","ingredients":[{"name":"재료명","amount":"수량(예: 200g)"}],"steps":["조리 단계 1","조리 단계 2"],"cookMinutes":20,"servings":2,"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}]}',
            "- 재료명은 괄호 없이 일반 명칭으로, 수량은 g, ml, 개, 큰술, 작은술 단위로 적으십시오.",
            "- 식재료로 볼 수 없는 입력은 사용하지 말고, 사용할 수 있는 식재료가 전혀 없으면 {\"recipes\":[]}만 출력하십시오.",
            "- 영양 수치는 추정치이며 참고용입니다.",
        ]
    )
    return "\n".join(lines)


def _iso_date(value):
    return isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) is not None


def _week_dates(start):
    import datetime

    first = datetime.date.fromisoformat(start)
    return [(first + datetime.timedelta(days=i)).isoformat() for i in range(7)]


def _build_week_prompt(c, start_date, pinned_keys):
    open_slots = []
    for date in _week_dates(start_date):
        for slot in ("breakfast", "lunch", "dinner"):
            if f"{date}|{slot}" not in pinned_keys:
                target = f" (열량 약 {round(c['goalCalories'] * _slot_share(slot))} kcal)" if c["goalCalories"] else ""
                protein = (
                    f", 단백질 약 {round(c['goalProtein'] * _slot_share(slot))}g" if c["goalProtein"] else ""
                )
                open_slots.append(f"- {date} {_slot_label(slot)}{target}{protein}")
    if not open_slots:
        return None
    lines = [
        "아래 조건으로 요청한 끼니만 JSON으로 구성하십시오.",
        f"- 보유 식재료: {c['ingredients'] or '없음'}",
        f"- 식사 인원: {c['servings']}명",
        f"- 조리 시간: {c['cookMinutes']}분 이내",
    ]
    if c["goalCalories"]:
        lines.append(f"- 하루 목표 열량: {c['goalCalories']} kcal")
    if c["goalProtein"]:
        lines.append(f"- 하루 목표 단백질: {c['goalProtein']} g")
    lines.extend(
        [
            f"- 식습관 및 선호: {c['preferences'] or '제한 없음'}",
            f"- 기피 및 알레르기: {c['restrictions'] or '없음'}",
        ]
    )
    if c["prioritizeExpiring"]:
        lines.append("- 목록 앞쪽 식재료는 유통기한이 가까우므로 우선 사용하십시오.")
    lines.extend(
        [
            "- 보유 식재료를 우선 사용하고, 제한 식재료는 절대 넣지 마십시오.",
            "- 같은 요리가 한 주에 반복되지 않게 하십시오.",
            "- nutrition에는 calories, protein, carbs, fat 숫자를 넣으십시오. 값은 참고용 추정치입니다.",
            '{"days":[{"date":"YYYY-MM-DD","meals":[{"slot":"breakfast","title":"요리명","description":"한 줄 설명","ingredients":[{"name":"재료","amount":"200g"}],"steps":["조리 1","조리 2"],"cookMinutes":20,"servings":2,"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}]}]}',
            "요청한 끼니:",
            *open_slots,
        ]
    )
    return "\n".join(lines)


def _build_swap_prompt(c, slot, avoid):
    lines = [
        "가정식 레시피 하나를 JSON 객체로만 출력하십시오.",
        f"- 끼니: {_slot_label(slot)}",
        f"- 보유 식재료: {c['ingredients'] or '없음'}",
        f"- 인원: {c['servings']}명, 조리 {c['cookMinutes']}분 이내",
    ]
    if c["goalCalories"]:
        lines.append(f"- 이 끼니 목표 열량 약 {round(c['goalCalories'] * _slot_share(slot))} kcal")
    if c["goalProtein"]:
        lines.append(f"- 이 끼니 단백질 약 {round(c['goalProtein'] * _slot_share(slot))}g")
    lines.extend(
        [
            f"- 선호: {c['preferences'] or '제한 없음'}",
            f"- 제외: {c['restrictions'] or '없음'}",
        ]
    )
    if avoid:
        lines.append(f"- 다음 요리명은 피하십시오: {', '.join(avoid)}")
    if c["prioritizeExpiring"]:
        lines.append("- 목록 앞쪽 재료(유통기한 임박)를 우선 사용하십시오.")
    lines.extend(
        [
            "- nutrition.calories, protein, carbs, fat 숫자를 포함하십시오.",
            '{"title":"","description":"","ingredients":[{"name":"","amount":""}],"steps":["",""],"cookMinutes":20,"servings":2,"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}',
        ]
    )
    return "\n".join(lines)


def _api_key():
    return (os.environ.get("ZHIPU_API_KEY") or "").strip()


def _chat(messages, models, max_tokens, temperature):
    key = _api_key()
    if not key:
        return None, "not_configured"
    last_err = "upstream"
    for model in models:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        req = urllib.request.Request(
            ZHIPU_URL,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer " + key,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=UPSTREAM_TIMEOUT) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            status = getattr(err, "code", 0)
            # Do not retry rate limits; do not read or forward the body.
            if status == 429:
                return None, "upstream"
            last_err = "upstream"
            continue
        except Exception:
            last_err = "upstream"
            continue
        try:
            content = data["choices"][0]["message"]["content"]
            if isinstance(content, list):
                parts = []
                for part in content:
                    if isinstance(part, dict) and isinstance(part.get("text"), str):
                        parts.append(part["text"])
                    elif isinstance(part, str):
                        parts.append(part)
                content = "\n".join(parts)
            text = (content or "").strip()
        except Exception:
            last_err = "upstream"
            continue
        if text:
            return text, None
        last_err = "upstream"
    return None, last_err


def _text_models():
    return [TEXT_MODEL, TEXT_FALLBACK]


def _extract_json(text):
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", text or "").strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    start_obj = cleaned.find("{")
    start_arr = cleaned.find("[")
    starts = [i for i in (start_obj, start_arr) if i >= 0]
    if not starts:
        return None
    start = min(starts)
    end = max(cleaned.rfind("}"), cleaned.rfind("]"))
    if end <= start:
        return None
    try:
        return json.loads(cleaned[start : end + 1])
    except Exception:
        return None


def _is_recipe(item):
    if not isinstance(item, dict):
        return False
    if not isinstance(item.get("title"), str) or not item["title"].strip():
        return False
    if not isinstance(item.get("description"), str):
        return False
    if not isinstance(item.get("ingredients"), list) or not isinstance(item.get("steps"), list):
        return False
    ingredients = []
    for row in item["ingredients"]:
        if not isinstance(row, dict) or not isinstance(row.get("name"), str) or not row["name"].strip():
            continue
        amount = row.get("amount") if isinstance(row.get("amount"), str) else ""
        ingredients.append({"name": row["name"].strip()[:MAX_INGREDIENT_NAME], "amount": amount[:40]})
    steps = [s.strip() for s in item["steps"] if isinstance(s, str) and s.strip()]
    if not ingredients or not steps:
        return False

    def num(value, default=0):
        try:
            number = float(value)
        except (TypeError, ValueError):
            return default
        if number != number:  # NaN
            return default
        return int(round(number))

    nutrition = item.get("nutrition") if isinstance(item.get("nutrition"), dict) else {}
    return {
        "title": item["title"].strip()[:80],
        "description": item["description"].strip()[:200],
        "ingredients": ingredients[:30],
        "steps": steps[:20],
        "cookMinutes": num(item.get("cookMinutes")) or 20,
        "servings": num(item.get("servings")) or 2,
        "nutrition": {
            "calories": max(0, num(nutrition.get("calories"))),
            "protein": max(0, num(nutrition.get("protein"))),
            "carbs": max(0, num(nutrition.get("carbs"))),
            "fat": max(0, num(nutrition.get("fat"))),
        },
    }


def _parse_recipes(text):
    data = _extract_json(text)
    if data is None:
        return []
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict) and isinstance(data.get("recipes"), list):
        items = data["recipes"]
    else:
        items = [data]
    recipes = []
    for item in items:
        parsed = _is_recipe(item)
        if parsed:
            recipes.append(parsed)
        if len(recipes) >= 3:
            break
    return recipes


def _handle_recipes(data):
    conditions = _read_conditions(data)
    if not conditions:
        return 400, {"error": "bad_request"}
    if not conditions["ingredients"]:
        return 400, {"error": "bad_request"}
    prompt = _build_recipe_prompt(conditions)
    text, err = _chat(
        [
            {"role": "system", "content": SYSTEM_RECIPE},
            {"role": "user", "content": prompt},
        ],
        _text_models(),
        max_tokens=4096,
        temperature=0.7,
    )
    if err:
        return (503 if err == "not_configured" else 502), {"error": err}
    recipes = _parse_recipes(text)
    if not recipes:
        return 502, {"error": "upstream"}
    return 200, {"recipes": recipes, "provider": "zhipu", "usedMock": False}


def _pinned_keys(value):
    keys = set()
    if not isinstance(value, list):
        return keys
    for item in value[:MAX_PINNED]:
        if not isinstance(item, dict):
            continue
        date = item.get("date")
        slot = item.get("slot")
        if _iso_date(date) and slot in {"breakfast", "lunch", "dinner"}:
            keys.add(f"{date}|{slot}")
    return keys


def _handle_meal_plan(data):
    conditions = _read_conditions(data)
    start = data.get("startDate")
    if not conditions or not conditions["ingredients"] or not _iso_date(start):
        return 400, {"error": "bad_request"}
    prompt = _build_week_prompt(conditions, start, _pinned_keys(data.get("pinned")))
    if not prompt:
        return 200, {"text": '{"days":[]}', "provider": "zhipu", "usedMock": False}
    text, err = _chat(
        [
            {"role": "system", "content": SYSTEM_RECIPE},
            {"role": "user", "content": prompt},
        ],
        _text_models(),
        max_tokens=8192,
        temperature=0.7,
    )
    if err:
        return (503 if err == "not_configured" else 502), {"error": err}
    parsed = _extract_json(text)
    if not isinstance(parsed, dict) or not isinstance(parsed.get("days"), list):
        return 502, {"error": "upstream"}
    return 200, {"text": json.dumps(parsed, ensure_ascii=False), "provider": "zhipu", "usedMock": False}


def _handle_swap(data):
    conditions = _read_conditions(data)
    slot = data.get("slot")
    if not conditions or not conditions["ingredients"] or slot not in {"breakfast", "lunch", "dinner"}:
        return 400, {"error": "bad_request"}
    avoid = []
    raw = data.get("avoidTitles")
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str) and item.strip():
                avoid.append(item.strip()[:80])
            if len(avoid) >= MAX_AVOID:
                break
    prompt = _build_swap_prompt(conditions, slot, avoid)
    text, err = _chat(
        [
            {"role": "system", "content": SYSTEM_RECIPE},
            {"role": "user", "content": prompt},
        ],
        _text_models(),
        max_tokens=2048,
        temperature=0.7,
    )
    if err:
        return (503 if err == "not_configured" else 502), {"error": err}
    parsed = _extract_json(text)
    recipe = _is_recipe(parsed) if isinstance(parsed, dict) else None
    if not recipe:
        return 502, {"error": "upstream"}
    return 200, {"recipe": recipe, "provider": "zhipu", "usedMock": False}


def _parse_image(data):
    image = data.get("image")
    mime = data.get("mimeType") or data.get("mime") or ""
    if not isinstance(image, str) or not image:
        return None
    raw = image.strip()
    if raw.startswith("data:"):
        header, _, payload = raw.partition(",")
        if not payload or ";base64" not in header:
            return None
        match = re.match(r"data:(image/[a-zA-Z0-9.+-]+);base64$", header)
        if not match:
            return None
        mime = match.group(1).lower()
        raw = payload
    mime = str(mime).lower().split(";")[0].strip()
    if mime == "image/jpg":
        mime = "image/jpeg"
    if mime not in ALLOWED_IMAGE_TYPES:
        return None
    try:
        # Tolerate whitespace in data URLs, but reject anything that is not base64.
        blob = base64.b64decode(re.sub(r"\s+", "", raw))
    except Exception:
        return None
    if not blob or len(blob) > MAX_IMAGE_BYTES:
        return None
    return mime, base64.b64encode(blob).decode("ascii")


def _parse_ingredient_list(text):
    data = _extract_json(text)
    if not isinstance(data, dict) or not isinstance(data.get("ingredients"), list):
        return None
    names = []
    seen = set()
    for item in data["ingredients"]:
        if not isinstance(item, str):
            continue
        name = item.strip()[:MAX_INGREDIENT_NAME]
        if not name or name in seen:
            continue
        seen.add(name)
        names.append(name)
        if len(names) >= 20:
            break
    return names


def _handle_vision(data):
    parsed = _parse_image(data)
    if not parsed:
        return 400, {"error": "bad_request"}
    mime, b64 = parsed
    restrictions = _clip(data.get("restrictions"), MAX_FIELD["restrictions"])
    prompt = "이 사진에 보이는 식재료만 한국어 일반 명칭으로 나열하십시오."
    if restrictions:
        prompt += f" 다음 기피 및 알레르기 재료는 목록에 넣지 마십시오: {restrictions}."
    # Vision must use glm-4v-flash only. Never fall back to a text-only model.
    text, err = _chat(
        [
            {"role": "system", "content": SYSTEM_VISION},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            },
        ],
        [VISION_MODEL],
        max_tokens=1024,
        temperature=0.2,
    )
    if err:
        return (503 if err == "not_configured" else 502), {"error": err}
    ingredients = _parse_ingredient_list(text)
    if ingredients is None:
        return 502, {"error": "upstream"}
    return 200, {"ingredients": ingredients, "demo": False, "provider": "zhipu"}


def handler(event, context):
    evt = _parse_event(event)
    origin = _origin(evt)
    method = _method(evt)
    if method == "OPTIONS":
        return {
            "statusCode": 204 if _origin_allowed(origin) else 403,
            "headers": _cors(origin),
            "isBase64Encoded": False,
            "body": "",
        }
    if method != "POST":
        return _resp(403, origin, {"error": "method_not_allowed"})
    if not _origin_allowed(origin):
        return _resp(403, origin, {"error": "origin_not_allowed"})

    raw = _body_raw(evt)
    if raw is None:
        return _resp(400, origin, {"error": "bad_request"})
    if len(raw) > MAX_BODY_BYTES:
        return _resp(413, origin, {"error": "payload_too_large"})
    try:
        data = json.loads(raw.decode("utf-8") or "{}")
        if not isinstance(data, dict):
            raise ValueError("bad body")
    except Exception:
        return _resp(400, origin, {"error": "bad_request"})

    task = data.get("task") or data.get("action")
    if task == "generate":
        task = "meal_plan"
    if task not in {"recipes", "meal_plan", "swap", "vision"}:
        return _resp(400, origin, {"error": "bad_request"})

    ip = _client_ip(evt)
    limit = VISION_RATE_LIMIT if task == "vision" else RATE_LIMIT
    if _rate_limited(ip, limit):
        return _resp(429, origin, {"error": "rate_limited"})

    if task == "recipes":
        status, payload = _handle_recipes(data)
    elif task == "meal_plan":
        status, payload = _handle_meal_plan(data)
    elif task == "swap":
        status, payload = _handle_swap(data)
    else:
        status, payload = _handle_vision(data)
    return _resp(status, origin, payload)
