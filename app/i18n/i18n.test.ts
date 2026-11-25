import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CATALOG } from "./catalog";
import { ko } from "./messages/ko";
import type { Messages } from "./messages/types";
import { localeOptionLabel, parseLocale } from "./locale";
import {
  abandonForScroll,
  BOOT_SCRIPT,
  dragPos,
  resolveTheme,
  shouldStartDrag,
  snapTheme,
  THEME_STORAGE_KEY,
} from "./theme";
import { format, localizeMessage } from "./text";
import { weekdayKo } from "../lib/dates";
import { SERVINGS_ERROR } from "../lib/limits";
import { bmiCategory } from "../lib/profile";
import { parseRestrictionSelection } from "../lib/restrictions";

const HAN = /[\u3400-\u9fff]/;
const DIAGNOSIS = /진단합니다|您患有|您被诊断|you are diagnosed|you have obesity|diagnosed with/i;

function leaves(value: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof value === "string") {
    out.push({ path, text: value });
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) leaves(child, `${path}.${key}`, out);
  }
}

function placeholders(text: string): string[] {
  const found: string[] = [];
  const pattern = /\{(\w+)\}/g;
  let match = pattern.exec(text);
  while (match) {
    found.push(match[1]);
    match = pattern.exec(text);
  }
  return found.sort();
}

describe("locale catalog", () => {
  function collect(value: unknown): { path: string; text: string }[] {
    const out: { path: string; text: string }[] = [];
    leaves(value, "root", out);
    return out;
  }
  const koFlat = collect(ko);

  it("defaults to formal Korean and treats unknown values as Korean", () => {
    assert.equal(parseLocale(null), "ko");
    assert.equal(parseLocale(""), "ko");
    assert.equal(parseLocale("ja"), "ko");
    assert.equal(parseLocale("zh"), "zh");
    assert.equal(parseLocale("en"), "en");
  });

  it("gives every locale the same keys and the same placeholders", () => {
    for (const locale of ["zh", "en"] as const) {
      const other = collect(CATALOG[locale]);
      assert.equal(other.length, koFlat.length);
      other.forEach((leaf, index) => {
        assert.equal(leaf.path, koFlat[index].path);
        assert.deepEqual(placeholders(leaf.text), placeholders(koFlat[index].text));
        assert.ok(leaf.text.trim().length > 0, leaf.path);
      });
    }
  });

  it("keeps Chinese characters out of the Korean copy", () => {
    for (const leaf of koFlat) {
      assert.equal(HAN.test(leaf.text), false, leaf.path);
    }
  });

  it("names Chinese in Korean without Chinese characters", () => {
    assert.equal(localeOptionLabel("zh", "ko"), "중국어");
    assert.equal(HAN.test(localeOptionLabel("zh", "ko")), false);
    assert.equal(localeOptionLabel("zh", "zh"), "中文");
    assert.equal(localeOptionLabel("ko", "en"), "한국어");
  });

  it("states medical wording as a disclaimer in every language", () => {
    for (const messages of Object.values(CATALOG) as Messages[]) {
      const blob = `${messages.footer.disclaimer}\n${messages.profile.medical}\n${messages.profile.restrictionsNote}\n${messages.profile.bmiScale}`;
      assert.equal(DIAGNOSIS.test(blob), false);
      assert.match(blob, /의사|医生|doctor/i);
      assert.match(blob, /영양사|营养师|dietitian/i);
      assert.match(blob, /진단|诊断|diagnos/i);
    }
  });

  it("does not put API key names in UI copy", () => {
    const blob = JSON.stringify(CATALOG);
    assert.equal(/API_KEY/.test(blob), false);
  });

  it("translates known Korean errors and leaves unknown recipe text", () => {
    assert.equal(ko.errors.servings, SERVINGS_ERROR);
    assert.equal(localizeMessage(SERVINGS_ERROR, CATALOG.en).includes("12"), true);
    assert.notEqual(localizeMessage(ko.errors.server, CATALOG.zh), ko.errors.server);
    assert.equal(localizeMessage(ko.errors.server, CATALOG.ko), ko.errors.server);
    assert.equal(localizeMessage("김치찌개", CATALOG.en), "김치찌개");
    const excluded = "된장찌개: 제한 재료(새우)가 포함되어 제외되었습니다.";
    assert.match(localizeMessage(excluded, CATALOG.en), /된장찌개/);
    assert.match(localizeMessage(excluded, CATALOG.en), /새우/);
    assert.equal(localizeMessage(excluded, CATALOG.ko), excluded);
  });

  it("fills placeholders", () => {
    assert.equal(format("오늘 {n}명", { n: 2 }), "오늘 2명");
  });
});

describe("theme preference", () => {
  it("uses a stored choice before the system scheme", () => {
    assert.equal(resolveTheme("light", true), "light");
    assert.equal(resolveTheme("dark", false), "dark");
    assert.equal(resolveTheme(null, true), "dark");
    assert.equal(resolveTheme(null, false), "light");
    assert.equal(resolveTheme("nope", false), "light");
  });

  it("boots from storage and only then from prefers-color-scheme", () => {
    const storedAt = BOOT_SCRIPT.indexOf("localStorage.getItem");
    const schemeAt = BOOT_SCRIPT.indexOf("prefers-color-scheme");
    assert.ok(storedAt >= 0 && schemeAt > storedAt);
    assert.match(BOOT_SCRIPT, new RegExp(THEME_STORAGE_KEY));
    assert.match(BOOT_SCRIPT, /t==="light"\|\|t==="dark"\)\?t:/);
  });

  it("drags horizontally without stealing a vertical scroll", () => {
    assert.equal(shouldStartDrag(9, 0), false);
    assert.equal(shouldStartDrag(12, 4), true);
    assert.equal(shouldStartDrag(12, 20), false);
    assert.equal(abandonForScroll(4, 12), true);
    assert.equal(abandonForScroll(12, 4), false);
    assert.equal(dragPos(0, 40, 80), 0.5);
    assert.equal(dragPos(0.2, -40, 80), 0);
    assert.equal(snapTheme(0.49), "dark");
    assert.equal(snapTheme(0.5), "light");
  });
});

describe("existing product rules", () => {
  it("does not select buckwheat by default", () => {
    assert.deepEqual(parseRestrictionSelection("").presets, []);
    const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    assert.match(home, /restrictions:\s*""/);
    assert.equal(home.includes('restrictions: "메밀"'), false);
  });

  it("keeps the Korean weekday and BMI labels used by existing helpers", () => {
    assert.equal(weekdayKo("2026-11-22"), "일");
    assert.equal(bmiCategory(18), "저체중");
    assert.equal(bmiCategory(22), "정상");
    assert.equal(bmiCategory(24), "과체중");
    assert.equal(bmiCategory(25), "비만");
  });
});
