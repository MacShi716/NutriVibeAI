"use client";

import { useEffect, useState } from "react";
import { joinRestrictions, parseRestrictionSelection, RESTRICTION_PRESETS } from "@/lib/restrictions";

export default function RestrictionPicker({
  value,
  onChange,
  inputId,
}: {
  value: string;
  onChange: (next: string) => void;
  inputId: string;
}) {
  const parsed = parseRestrictionSelection(value);
  const [customDraft, setCustomDraft] = useState(parsed.custom);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setCustomDraft(parsed.custom);
  }, [parsed.custom, focused]);

  function toggle(name: (typeof RESTRICTION_PRESETS)[number]) {
    const next = parsed.presets.includes(name)
      ? parsed.presets.filter((item) => item !== name)
      : [...parsed.presets, name];
    onChange(joinRestrictions(next, customDraft));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="기피 및 알레르기">
        {RESTRICTION_PRESETS.map((name) => {
          const on = parsed.presets.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              data-testid={`restriction-chip-${name}`}
              onClick={() => toggle(name)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                on
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
      <label className="mt-3 block text-xs text-gray-500" htmlFor={inputId}>
        그 외 기피 식재료
        <input
          id={inputId}
          value={customDraft}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const next = e.target.value;
            setCustomDraft(next);
            onChange(joinRestrictions(parsed.presets, next));
          }}
          placeholder="예: 고수, 조개 (쉼표로 구분)"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </label>
    </div>
  );
}
