"use client";

import { useMemo, useState } from "react";

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
        setError("드실 인분을 입력해 주세요. 임의로 정하지 않습니다.");
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
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
        <h2 id="portion-prompt-title" className="text-base font-bold text-gray-900">
          드실 양을 알려 주세요
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          몇 인분을 기록할지 직접 입력해 주세요. 기본 인분을 가정하지 않습니다.
        </p>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg bg-gray-50 px-3 py-3">
              <p className="text-sm font-medium text-gray-800">{item.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SERVING_CHIPS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={values[item.id] === String(count)}
                    onClick={() => setValue(item.id, String(count))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      values[item.id] === String(count)
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {count}인분
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={values[item.id] === "0.5"}
                  onClick={() => setValue(item.id, "0.5")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    values[item.id] === "0.5"
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  0.5인분
                </button>
              </div>
              <label className="mt-2 block text-xs text-gray-500">
                인분
                <input
                  type="number"
                  min={0.5}
                  max={12}
                  step={0.5}
                  inputMode="decimal"
                  value={values[item.id] ?? ""}
                  placeholder="예: 1"
                  onChange={(e) => setValue(item.id, e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800"
                />
              </label>
            </li>
          ))}
        </ul>
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={confirm}
            className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            이 양으로 담기
          </button>
        </div>
      </div>
    </div>
  );
}
