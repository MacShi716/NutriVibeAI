#!/usr/bin/env python3
"""Curate compact, licensed built-in recipe libraries for NutriVibeAI.

Sources (see docs/RECIPE_SOURCES.md):
- Chinese: Anduin2017/HowToCook (Unlicense / public domain)
- English everyday: micahcochran/json-cookbook entries from USDA / NHLBI / NLM
  (U.S. government works, public domain)
- English buckwheat tag: Wikibooks Cookbook:Buckwheat Ginger Banana Cake
  with Chocolate (CC BY, originally Foodista)
"""

from __future__ import annotations

import json
import re
from pathlib import Path

HOWTOCOOK = Path("/tmp/recipe-sources/howtocook/dishes")
COOKBOOK = Path("/tmp/recipe-sources/json-cookbook/cookbook-100.json")
WIKI_CAKE = Path("/tmp/recipe-sources/buckwheat-cake.wiki")
OUT = Path("/workspace/nutrivibe-i18n-recipes/repo/app/data/recipes")

SEASONINGS = {
    "盐", "食盐", "糖", "白糖", "冰糖", "油", "食用油", "植物油", "色拉油", "香油", "芝麻油",
    "生抽", "老抽", "酱油", "醋", "香醋", "料酒", "淀粉", "水淀粉", "味精", "味素", "鸡精",
    "胡椒", "胡椒粉", "花椒", "水", "清水", "开水", "葱", "姜", "蒜", "葱姜蒜",
    "salt", "sugar", "oil", "water", "pepper", "black pepper", "baking powder",
    "baking soda", "vegetable oil", "olive oil", "soy sauce",
}

ZH_TARGETS = [
    "西红柿炒鸡蛋", "酸辣土豆丝", "红烧茄子", "地三鲜", "蒜蓉西兰花", "蚝油生菜",
    "凉拌黄瓜", "皮蛋豆腐", "炒青菜", "虎皮青椒", "干锅花菜", "葱煎豆腐",
    "凉拌木耳", "清炒花菜", "蒜蓉空心菜", "鸡蛋羹",
    "宫保鸡丁", "鱼香肉丝", "回锅肉", "糖醋里脊", "可乐鸡翅", "西红柿牛腩",
    "小炒肉", "麻婆豆腐", "鱼香茄子", "土豆炖排骨", "黄瓜炒肉", "青椒土豆炒肉",
    "香菇滑鸡", "酱牛肉", "糖醋排骨", "黄焖鸡",
    "白灼虾", "清蒸鲈鱼", "蒜蓉虾", "红烧鱼", "油焖大虾",
    "西红柿鸡蛋汤", "紫菜蛋花汤", "玉米排骨汤", "皮蛋瘦肉粥", "金针菇汤", "番茄牛肉蛋花汤",
    "蛋炒饭", "西红柿鸡蛋挂面", "扬州炒饭", "葱油拌面", "炒河粉", "煮泡面加蛋", "肉蛋盖饭",
    "茶叶蛋", "牛奶燕麦", "煎饺", "太阳蛋", "蒸水蛋", "美式炒蛋",
    "酱拌荞麦面",
]


def find_md(stem: str) -> Path | None:
    hits = [p for p in HOWTOCOOK.rglob("*.md") if p.stem == stem and "template" not in str(p)]
    return hits[0] if hits else None


def extract_section(text: str, heading: str) -> str:
    pattern = rf"^##\s+{re.escape(heading)}\s*$"
    m = re.search(pattern, text, re.M)
    if not m:
        return ""
    rest = text[m.end() :]
    nxt = re.search(r"^##\s+", rest, re.M)
    return rest[: nxt.start()] if nxt else rest


def first_paragraph(text: str) -> str:
    lines = []
    started = False
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("#"):
            continue
        if not line:
            if started:
                break
            continue
        if line.startswith("预估") or line.startswith("!") or line.startswith("["):
            continue
        started = True
        lines.append(line)
    desc = "".join(lines)
    desc = re.sub(r"\s+", "", desc)
    # keep a readable short summary: first two sentences or ~80-100 chars with punctuation
    parts = re.split(r"(。|！)", desc)
    assembled = ""
    for i in range(0, len(parts), 2):
        chunk = parts[i]
        punct = parts[i + 1] if i + 1 < len(parts) else "。"
        assembled += chunk + punct
        if len(assembled) >= 40:
            break
    return assembled[:120] if assembled else desc[:80]


def parse_minutes(text: str, default: int) -> int:
    patterns = [
        r"大约(?:只需|需要|制作时长)?\s*(\d{1,3})\s*分钟",
        r"约\s*(\d{1,3})\s*分钟",
        r"预计[^\d]{0,8}(\d{1,3})\s*分钟",
        r"一般约\s*(\d{1,3})\s*分钟",
        r"(\d{1,3})\s*分钟即可",
        r"(\d{1,3})\s*分钟便可",
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            n = int(m.group(1))
            if 5 <= n <= 180:
                return n
    return default



ING_AMOUNT_RE = re.compile(
    r"^(?P<name>.+?)\s*(?:=|为|用量为|数量\s*=\s*)?\s*(?P<num>\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*(?P<unit>g|kg|ml|l|mL|ML|克|千克|毫升|升|个|颗|根|片|滴|小块|大勺|小勺|汤匙|茶匙|勺|斤|支|棵|把)?(?:\s*/(?:人|per|份).*)?$",
    re.I,
)


def clean_zh_name(name: str) -> str:
    name = re.sub(r"[🥛🍳🍚🥑]+", "", name)
    name = re.sub(r"（[^）]*）", "", name)
    name = re.sub(r"\([^)]*\)", "", name)
    name = re.sub(r"`+", "", name)
    name = re.sub(r"(的用量|的数量|的用量为|用量为)$", "", name)
    name = re.sub(r"(的用量|的数量)$", "", name)
    name = name.replace("必须配料", "").replace("可选配料", "")
    name = name.strip(" ：:，、.*-")
    return name


def parse_one_ing(chunk: str) -> dict | None:
    chunk = chunk.strip().strip("，、;；")
    if not chunk or chunk.startswith("每份") or "使用上述条件" in chunk or "注意" in chunk:
        return None
    if chunk.endswith("：") or chunk.endswith(":"):
        return None
    chunk = re.sub(r"^[\-\*]+\s*", "", chunk)
    chunk = re.sub(r"（[^）]*）", "", chunk)
    chunk = re.sub(r"\([^)]*\)", "", chunk).strip()
    chunk = re.sub(r"[🥛🍳🍚🥑]\s*", "", chunk)
    # "鸡蛋的用量为 1 个"
    chunk = re.sub(r"的用量为", " ", chunk)
    chunk = re.sub(r"的数量\s*=", " ", chunk)
    chunk = re.sub(r"用量为", " ", chunk)
    chunk = re.sub(r"\s*=\s*", " ", chunk)
    chunk = re.sub(r"\s+", " ", chunk).strip()
    if not chunk:
        return None
    m = ING_AMOUNT_RE.match(chunk)
    if m:
        name = clean_zh_name(m.group("name"))
        if not name or len(name) > 20:
            return None
        num = m.group("num").split("-")[0].strip()
        unit = (m.group("unit") or "").replace("mL", "ml").replace("ML", "ml")
        unit = {"克": "g", "千克": "kg", "毫升": "ml", "升": "l", "斤": "g"}.get(unit, unit)
        if m.group("unit") == "斤":
            try:
                num = str(int(float(num) * 500))
            except ValueError:
                pass
            unit = "g"
        amount = f"{num}{unit}" if unit else num
        return {"name": name, "amount": amount}
    name = clean_zh_name(chunk)
    if 1 <= len(name) <= 16 and not name.endswith("。") and "计算" not in name:
        return {"name": name, "amount": "适量"}
    return None


def parse_zh_ingredients(section: str) -> list[dict]:
    items: list[dict] = []
    # split list lines and also "A 30g、B 30g" packed lines
    for raw in section.splitlines():
        line = raw.strip()
        if not line:
            continue
        if not re.match(r"^[\-\*]\s+", line) and "、" not in line and not re.search(r"\d", line):
            continue
        line = re.sub(r"^[\-\*]+\s+", "", line)
        parts = re.split(r"[、；;]", line) if re.search(r"\d", line) and "、" in line else [line]
        for part in parts:
            item = parse_one_ing(part)
            if item:
                items.append(item)
    seen = set()
    out = []
    for item in items:
        if item["name"] in seen:
            continue
        seen.add(item["name"])
        out.append(item)
    return out


def parse_zh_steps(section: str) -> list[str]:
    steps = []
    skip_block = False
    for raw in section.splitlines():
        line = raw.strip()
        if re.match(r"^###\s+", line):
            heading = re.sub(r"^###\s+", "", line)
            skip_block = any(k in heading for k in ("稍加复杂", "更加令人", "进阶", "豪华", "可选做法"))
            continue
        if skip_block:
            continue
        if not line or line.startswith("!") or line.startswith("[") or line.startswith(">") or line.startswith("注"):
            continue
        if line.startswith("烹饪基本") or line.startswith("如果您遵循"):
            continue
        numbered = re.match(r"^(\d+)\s*[\.、．]\s*(.+)$", line)
        if numbered:
            line = numbered.group(2)
        elif re.match(r"^[\-\*]\s+", line):
            line = re.sub(r"^[\-\*]+\s+", "", line)
            # skip tiny seasoning bullets that belong to a parent step
            if len(re.sub(r"\s+", "", line)) < 8:
                continue
        else:
            continue
        line = re.sub(r"`+", "", line)
        line = re.sub(r"\s+", "", line)
        line = line.replace("**", "")
        if len(line) >= 4:
            steps.append(line)
    return steps[:12]



TOOL_WORDS = {
    "锅", "平底锅", "炒锅", "碗", "筷子", "牙签", "筷子或牙签", "微波炉", "烤箱",
    "砧板", "菜刀", "容器", "盘子", "铲子", "电饭煲",
}

MEAT_GENERAL = {
    "五花肉": "猪肉",
    "二刀肉": "猪肉",
    "里脊肉": "猪肉",
    "里脊": "猪肉",
    "排骨": "猪肉",
    "手枪腿": "鸡肉",
    "鸡胸脯肉": "鸡肉",
    "鸡胸肉": "鸡肉",
    "鸡翅": "鸡肉",
    "牛腩": "牛肉",
}

def tidy_name(name: str) -> str:
    name = re.sub(r"[*＊].*$", "", name)
    name = re.sub(r"=.*$", "", name)
    name = re.sub(r"(的用量|的数量|用量).*$", "", name)
    name = re.sub(r"\s+\d.*$", "", name)
    name = name.strip(" ：:，、.*-")
    return name

def is_tool(name: str) -> bool:
    compact = re.sub(r"\s+", "", name)
    return compact in TOOL_WORDS or any(w in compact and compact.endswith(w) for w in ("锅", "碗", "筷子", "牙签"))

def merge_ingredients(calc_ings: list[dict], tool_ings: list[dict]) -> list[dict]:
    foods = []
    for item in tool_ings:
        name = tidy_name(item["name"])
        if not name or is_tool(name):
            continue
        foods.append({"name": name, "amount": "适量"})
    if len(foods) >= 2:
        # attach amounts from calc when the tool name appears in a calc line
        for food in foods:
            for calc in calc_ings:
                raw = calc["name"] + calc.get("amount", "")
                if food["name"] in raw or tidy_name(calc["name"]) == food["name"]:
                    if calc.get("amount") and calc["amount"] != "适量":
                        food["amount"] = calc["amount"]
                    break
        return foods
    cleaned = []
    for item in calc_ings:
        name = tidy_name(item["name"])
        if not name or is_tool(name):
            continue
        cleaned.append({"name": name, "amount": item["amount"]})
    return cleaned or calc_ings

def expand_matches(names: list[str]) -> list[str]:
    out = list(names)
    for n in names:
        general = MEAT_GENERAL.get(n)
        if general and general not in out:
            out.append(general)
    return out

def strip_md(text: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    return text.replace("`", "").replace("**", "")


def category_for(path: Path, title: str) -> str:
    rel = str(path)
    if "breakfast" in rel:
        return "meal"
    if title.startswith("凉拌") or title in {"皮蛋豆腐", "葱煎豆腐"}:
        return "side"
    if "soup" in rel:
        return "meal"
    if "staple" in rel:
        return "meal"
    if title in {"太阳蛋", "茶叶蛋", "牛奶燕麦", "美式炒蛋", "蒸水蛋"}:
        return "meal"
    return "meal"


def defaults_minutes(path: Path) -> int:
    rel = str(path)
    if "soup" in rel:
        return 25
    if "meat" in rel or "aquatic" in rel:
        return 30
    if "breakfast" in rel:
        return 15
    if "staple" in rel:
        return 20
    return 20


def primary_matches(ings: list[dict]) -> tuple[list[str], str]:
    mains = []
    for item in ings:
        n = item["name"]
        compact = re.sub(r"[、，\s]", "", n)
        if compact in SEASONINGS:
            continue
        if any(s in compact and compact.endswith(s) or compact == s for s in SEASONINGS if len(s) >= 2):
            # still allow 葱油生菜 etc as names; only skip pure seasonings
            if compact in SEASONINGS:
                continue
        if n in SEASONINGS:
            continue
        mains.append(n)
        if len(mains) >= 3:
            break
    if not mains and ings:
        mains = [ings[0]["name"]]
    return mains, (mains[0] if mains else ings[0]["name"])


def build_zh() -> list[dict]:
    recipes = []
    missing = []
    weak = []
    for title in ZH_TARGETS:
        path = find_md(title)
        if not path:
            missing.append(title)
            continue
        text = path.read_text(encoding="utf-8")
        calc = extract_section(text, "计算")
        tools = extract_section(text, "必备原料和工具")
        ops = extract_section(text, "操作")
        ings = merge_ingredients(parse_zh_ingredients(calc), parse_zh_ingredients(tools))
        steps = [strip_md(s) for s in parse_zh_steps(ops)]
        desc = first_paragraph(text)
        if len(ings) < 2 or len(steps) < 2 or len(desc) < 8:
            weak.append((title, len(ings), len(steps), len(desc)))
            continue
        matches, main = primary_matches(ings)
        matches = expand_matches(matches)
        if title in MEAT_GENERAL.values():
            pass
        for n, general in MEAT_GENERAL.items():
            if n in {i["name"] for i in ings} and general not in matches:
                matches.append(general)
                if main in ("小葱", "生姜", "盐"):
                    main = n
        rel = path.relative_to(HOWTOCOOK.parent).as_posix()
        recipes.append(
            {
                "id": f"zh-{len(recipes)+1:03d}",
                "matches": matches,
                "main": main,
                "category": category_for(path, title),
                "title": title,
                "description": desc,
                "ingredients": ings,
                "steps": steps,
                "cookMinutes": parse_minutes(text, defaults_minutes(path)),
                "source": {
                    "name": "Anduin2017/HowToCook",
                    "url": f"https://github.com/Anduin2017/HowToCook/blob/master/{rel}",
                    "license": "Unlicense",
                },
            }
        )
    print("ZH ok", len(recipes), "missing", missing, "weak", weak)
    return recipes


GOV_LICENSES = {
    "https://www.usda.gov/policies-and-links": ("USDA MyPlate / SNAP-Ed", "U.S. government work, public domain"),
    "https://www.nhlbi.nih.gov/about/contact/trademark-branding-and-logo": (
        "NHLBI Deliciously Healthy Eating Recipes",
        "U.S. government work, public domain",
    ),
    "https://www.nlm.nih.gov/web_policies.html#copyright": (
        "NIH / NLM MedlinePlus",
        "U.S. government work, public domain",
    ),
}


def parse_iso_minutes(value) -> int | None:
    if not isinstance(value, str):
        return None
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?", value)
    if not m:
        return None
    hours = int(m.group(1) or 0)
    mins = int(m.group(2) or 0)
    total = hours * 60 + mins
    return total if 5 <= total <= 180 else None


def split_en_ingredient(raw: str) -> dict:
    text = re.sub(r"\s+", " ", raw).strip()
    # "1 tablespoon vegetable oil"
    m = re.match(
        r"^((?:\d+/\d+|\d+(?:\.\d+)?)(?:\s+\d+/\d+)?)\s+(cups?|tablespoons?|teaspoons?|tbsp|tsp|ounces?|oz|pounds?|lb|lbs|cans?|slices?|cloves?|cups?)\s+(?:of\s+)?(.+)$",
        text,
        re.I,
    )
    if m:
        return {"name": m.group(3).strip(" ."), "amount": f"{m.group(1)} {m.group(2).lower()}"}
    m = re.match(r"^((?:\d+/\d+|\d+(?:\.\d+)?))\s+(.+)$", text)
    if m:
        rest = m.group(2).strip()
        return {"name": rest, "amount": m.group(1)}
    return {"name": text, "amount": "to taste"}


def en_steps(raw) -> list[str]:
    steps = []
    if isinstance(raw, str):
        parts = re.split(r"\n+", raw)
        steps = [re.sub(r"\s+", " ", p).strip() for p in parts if p.strip()]
    elif isinstance(raw, list):
        for item in raw:
            if isinstance(item, str):
                steps.append(re.sub(r"\s+", " ", item).strip())
            elif isinstance(item, dict):
                t = item.get("text") or item.get("name") or ""
                if t:
                    steps.append(re.sub(r"\s+", " ", str(t)).strip())
    return [s for s in steps if len(s) >= 8][:12]


def en_desc(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    # first two sentences
    parts = re.split(r"(?<=[.!?])\s+", text)
    assembled = " ".join(parts[:2]).strip()
    return assembled[:220]


def en_category(name: str, steps_or_cat) -> str:
    low = f"{name} {steps_or_cat or ''}".lower()
    if any(w in low for w in ["cake", "pie", "pudding", "cobbler", "cookie", "bar", "muffin", "smoothie", "shake"]):
        return "dessert" if any(w in low for w in ["cake", "pie", "pudding", "cobbler", "cookie", "bar", "muffin"]) else "snack"
    if any(w in low for w in ["salad", "slaw", "sauce"]):
        return "side"
    return "meal"


def en_matches(ings: list[dict]) -> tuple[list[str], str]:
    mains = []
    for item in ings:
        n = item["name"].lower()
        n = re.sub(r"\([^)]*\)", "", n).strip()
        if n in SEASONINGS:
            continue
        if any(n == s or n.endswith(s) and s in {"oil", "salt", "sugar", "pepper", "water"} for s in SEASONINGS):
            continue
        mains.append(item["name"])
        if len(mains) >= 3:
            break
    if not mains:
        mains = [ings[0]["name"]]
    return mains, mains[0]


def build_en() -> list[dict]:
    data = json.loads(COOKBOOK.read_text())
    recipes = []
    skipped = []
    for raw in data:
        license_url = raw.get("license") or ""
        if license_url not in GOV_LICENSES:
            continue
        title = (raw.get("name") or "").strip()
        ings_raw = raw.get("recipeIngredient") or []
        steps = en_steps(raw.get("recipeInstructions"))
        ings = [split_en_ingredient(x) for x in ings_raw if isinstance(x, str) and x.strip()]
        desc = en_desc(raw.get("description") or "")
        if not desc:
            desc = f"An everyday recipe from a U.S. public-domain cookbook collection: {title}."
        if len(ings) < 3 or len(steps) < 2 or not title:
            skipped.append((title, len(ings), len(steps)))
            continue
        # drop obviously broken
        if title.startswith("Mock-Southern"):
            skipped.append((title, "broken"))
            continue
        source_name, license_name = GOV_LICENSES[license_url]
        minutes = (
            parse_iso_minutes(raw.get("cookTime"))
            or parse_iso_minutes(raw.get("totalTime"))
            or parse_iso_minutes(raw.get("prepTime"))
            or 25
        )
        matches, main = en_matches(ings)
        cat = en_category(title, raw.get("recipeCategory"))
        recipes.append(
            {
                "id": f"en-{len(recipes)+1:03d}",
                "matches": matches,
                "main": main,
                "category": cat,
                "title": title,
                "description": desc,
                "ingredients": ings,
                "steps": steps,
                "cookMinutes": minutes,
                "source": {
                    "name": source_name,
                    "url": raw.get("url") or "https://github.com/micahcochran/json-cookbook",
                    "license": license_name,
                },
            }
        )
    # Wikibooks CC BY buckwheat cake so 메밀 / buckwheat filtering has an English hit
    wiki = WIKI_CAKE.read_text(encoding="utf-8")
    recipes.append(
        {
            "id": f"en-{len(recipes)+1:03d}",
            "matches": ["buckwheat flour", "banana", "chocolate"],
            "main": "buckwheat flour",
            "category": "dessert",
            "title": "Buckwheat Ginger Banana Cake",
            "description": "A gluten-free ginger banana cake made with buckwheat flour, maple syrup, and dark chocolate.",
            "ingredients": [
                {"name": "buckwheat flour", "amount": "1 cup (135 g)"},
                {"name": "baking powder", "amount": "1 tsp"},
                {"name": "baking soda", "amount": "1 tsp"},
                {"name": "maple syrup", "amount": "1/4 cup (60 ml)"},
                {"name": "unsweetened applesauce", "amount": "1/4 cup (60 ml)"},
                {"name": "lemon juice", "amount": "1/2 lemon"},
                {"name": "fresh ginger", "amount": "1 tbsp, grated"},
                {"name": "banana", "amount": "3 ripe"},
                {"name": "dark chocolate", "amount": "1/4 cup, chopped"},
            ],
            "steps": [
                "Preheat the oven to 170°C (338°F).",
                "Mix the buckwheat flour, baking powder, and baking soda in a bowl, and set aside.",
                "Mix the maple syrup with the applesauce, the lemon juice, and the grated ginger. Mash the bananas with a fork and mix them with the other wet ingredients.",
                "Combine the dry ingredients with the banana mixture. Be careful not to overmix.",
                "Add the dark chocolate and gently mix again.",
                "Line a 20 x 20 cm (8 x 8 inch) pan with parchment and pour in the batter.",
                "Bake for about 45 minutes, or until a toothpick inserted in the center comes out clean.",
            ],
            "cookMinutes": 60,
            "source": {
                "name": "Wikibooks Cookbook (originally Foodista, Anne Pedersen)",
                "url": "https://en.wikibooks.org/wiki/Cookbook:Buckwheat_Ginger_Banana_Cake_with_Chocolate",
                "license": "CC BY (Foodista) / CC BY-SA 4.0 (Wikibooks)",
            },
        }
    )
    print("EN ok", len(recipes), "skipped", skipped)
    return recipes


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    zh = build_zh()
    en = build_en()
    (OUT / "zh.json").write_text(json.dumps(zh, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "en.json").write_text(json.dumps(en, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT / "zh.json", "bytes", (OUT / "zh.json").stat().st_size)
    print("wrote", OUT / "en.json", "bytes", (OUT / "en.json").stat().st_size)
    print("ZH titles:", ", ".join(r["title"] for r in zh))
    print("EN titles:", ", ".join(r["title"] for r in en))


if __name__ == "__main__":
    main()
