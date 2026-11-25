"use client";

import { useEffect, useState } from "react";
import { storage, SUPPLEMENTS_EVENT } from "@/lib/storage";
import {
  DOSE_UNITS,
  normalizeSupplement,
  removeSupplement,
  setTakenToday,
  takenToday,
  upsertSupplement,
} from "@/lib/supplements";
import type { SupplementItem, SupplementLog } from "@/lib/types";

const EMPTY_FORM = {
  name: "",
  doseLabel: "",
  dailyCount: "1",
  reminderTime: "",
  unit: "",
};

export default function SupplementPlanner() {
  const [items, setItems] = useState<SupplementItem[]>([]);
  const [log, setLog] = useState<SupplementLog>({ date: "", taken: {} });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      setItems(storage.getSupplements());
      setLog(storage.getSupplementLog());
      setReady(true);
    };
    load();
    window.addEventListener(SUPPLEMENTS_EVENT, load);
    return () => window.removeEventListener(SUPPLEMENTS_EVENT, load);
  }, []);

  function startEdit(item: SupplementItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      doseLabel: item.doseLabel,
      dailyCount: String(item.dailyCount),
      reminderTime: item.reminderTime ?? "",
      unit: "",
    });
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const doseLabel = [form.doseLabel.trim(), form.unit].filter(Boolean).join(" ");
    const result = normalizeSupplement({
      id: editingId ?? undefined,
      name: form.name,
      doseLabel,
      dailyCount: Number(form.dailyCount),
      reminderTime: form.reminderTime.trim() || null,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    upsertSupplement(result.item);
    resetForm();
  }

  if (!ready) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="supplement-planner">
      <h2 className="text-sm font-bold text-gray-900">오늘의 영양제</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        이름과 하루 횟수, 1회 분량을 직접 등록해 주세요. 기본 영양제 목록은 비어 있으며, 이 기기에만 저장됩니다.
        복용 기록은 의학적 처방이나 진단이 아닙니다.
      </p>

      {items.length === 0 ? (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-600">
          아직 등록한 영양제가 없습니다. 아래에서 추가해 주세요.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const taken = takenToday(item.id, log);
            return (
              <li key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      하루 {item.dailyCount}회
                      {item.doseLabel ? ` · 1회 ${item.doseLabel}` : ""}
                      {item.reminderTime ? ` · 알림 ${item.reminderTime}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSupplement(item.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {Array.from({ length: item.dailyCount }, (_, index) => {
                    const n = index + 1;
                    const on = taken >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTakenToday(item.id, on && taken === n ? n - 1 : n)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          on
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {n}회차 {on ? "복용함" : "미복용"}
                      </button>
                    );
                  })}
                  <span className="text-xs text-gray-500">
                    오늘 {taken}/{item.dailyCount}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
        <h3 className="text-xs font-bold text-gray-800">{editingId ? "영양제 수정" : "영양제 추가"}</h3>
        <label className="block text-xs text-gray-500">
          이름
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="예: 비타민"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-gray-500">
            1회 분량
            <span className="mt-1 flex gap-2">
              <input
                value={form.doseLabel}
                onChange={(e) => setForm((prev) => ({ ...prev, doseLabel: e.target.value }))}
                placeholder="예: 1"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
              />
              <select
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800"
              >
                <option value="">단위</option>
                {DOSE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="block text-xs text-gray-500">
            하루 횟수
            <input
              type="number"
              min={1}
              max={12}
              value={form.dailyCount}
              onChange={(e) => setForm((prev) => ({ ...prev, dailyCount: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
            />
          </label>
        </div>
        <label className="block text-xs text-gray-500">
          다음 복용 알림 시각 (선택)
          <input
            type="time"
            value={form.reminderTime}
            onChange={(e) => setForm((prev) => ({ ...prev, reminderTime: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
          />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          )}
          <button
            type="submit"
            className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            {editingId ? "수정 저장" : "추가"}
          </button>
        </div>
      </form>
    </section>
  );
}
