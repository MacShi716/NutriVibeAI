import { translateToKorean } from "./alias";
import { splitIngredients } from "./shopping";

/** 홈·프로필에서 고르는 기피·알레르기. 메밀은 선택 항목이며 기본으로 켜지지 않는다. */
export const RESTRICTION_PRESETS = ["메밀", "땅콩", "우유", "새우", "달걀", "밀", "대두"] as const;

export type RestrictionPreset = (typeof RESTRICTION_PRESETS)[number];

function compact(value: string): string {
  return translateToKorean(value).replace(/\s+/g, "");
}

function presetOf(token: string): RestrictionPreset | null {
  const key = compact(token);
  for (const preset of RESTRICTION_PRESETS) {
    if (compact(preset) === key) return preset;
  }
  return null;
}

export function parseRestrictionSelection(raw: string): { presets: RestrictionPreset[]; custom: string } {
  const presets: RestrictionPreset[] = [];
  const custom: string[] = [];
  for (const token of splitIngredients(raw)) {
    const preset = presetOf(token);
    if (preset) {
      if (!presets.includes(preset)) presets.push(preset);
    } else {
      custom.push(token);
    }
  }
  return { presets, custom: custom.join(", ") };
}

/** 선택한 칩과 직접 입력한 항목을 기존 restrictions 문자열로 합친다. */
export function joinRestrictions(presets: readonly string[], custom: string): string {
  const selected = new Set<RestrictionPreset>();
  for (const name of presets) {
    const preset = presetOf(name);
    if (preset) selected.add(preset);
  }
  const extras: string[] = [];
  for (const token of splitIngredients(custom)) {
    const preset = presetOf(token);
    if (preset) selected.add(preset);
    else extras.push(token);
  }
  const ordered = RESTRICTION_PRESETS.filter((preset) => selected.has(preset));
  return [...ordered, ...extras].join(", ");
}
