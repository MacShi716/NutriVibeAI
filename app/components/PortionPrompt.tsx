"use client";

import { useMemo, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { format } from "@/i18n/text";

export const SERVING_CHIPS = [1, 2, 3, 4] as const;

export type PortionItem = {
  id: string;
  title: string;
};

function parseServings(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 12) return null;
  return value;
}

export default function PortionPrompt({
  items,
  onConfirm,
  onCancel,
}: {
  items: PortionItem[];
  onConfirm: (servingsById: Record<string, number>) => void;
  onCancel: () => void;
}) {
  const { t } = useUi();
  const initial = useMemo(() => {
    const next: Record<string, string> = {};
    for (const item of items) next[item.id] = "";
    return next;
  }, [items]);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [error, setError] = useState("");

  function setValue(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
    setError("");
  }

  function confirm() {
    const servingsById: Record<string, number> = {};
    for (const item of items) {
      const servings = parseServings(values[item.id] ?? "");
      if (servings == null) {
        setError(t.portion.error);
        return;
      }
      servingsById[item.id] = servings;
    }
    onConfirm(servingsById);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portion-prompt-title"
      data-testid="portion-prompt"
    >
      <div className="nv-card nv-card--compact w-full max-w-md p-5">
        <h2 id="portion-prompt-title" className="text-base font-bold text-gray-900">
          {t.portion.title}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{t.portion.body}</p>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="nv-inset px-3 py-3">
              <p className="text-sm font-medium text-gray-800">{item.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SERVING_CHIPS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={values[item.id] === String(count)}
                    onClick={() => setValue(item.id, String(count))}
                    className={`nv-chip px-3 py-1 text-xs font-medium ${
                      values[item.id] === String(count)
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {format(t.portion.chip, { n: count })}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={values[item.id] === "0.5"}
                  onClick={() => setValue(item.id, "0.5")}
                  className={`nv-chip px-3 py-1 text-xs font-medium ${
                    values[item.id] === "0.5"
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t.portion.half}
                </button>
              </div>
              <label className="mt-2 block text-xs text-gray-500">
                {t.portion.servings}
                <input
                  type="number"
                  min={0.5}
                  max={12}
                  step={0.5}
                  inputMode="decimal"
                  value={values[item.id] ?? ""}
                  placeholder={t.portion.placeholder}
                  onChange={(e) => setValue(item.id, e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800"
                />
              </label>
            </li>
          ))}
        </ul>
        {error && <p className="nv-error mt-3">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="nv-btn-secondary flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={confirm}
            className="nv-btn flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            {t.portion.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
