"use client";

import { useEffect, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { format, localizeMessage } from "@/i18n/text";
import type { Messages } from "@/i18n/messages/types";
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

function unitLabel(unit: string, messages: Messages): string {
  switch (unit) {
    case "정":
      return messages.supplements.unitTablet;
    case "캡슐":
      return messages.supplements.unitCapsule;
    case "포":
      return messages.supplements.unitPacket;
    case "ml":
      return messages.supplements.unitMl;
    case "g":
      return messages.supplements.unitG;
    case "회":
      return messages.supplements.unitCount;
    default:
      return unit;
  }
}

function displayDose(label: string, messages: Messages): string {
  const units = ["캡슐", "정", "포", "ml", "g", "회"];
  for (const unit of units) {
    const spaced = ` ${unit}`;
    if (label.endsWith(spaced)) return `${label.slice(0, -spaced.length)} ${unitLabel(unit, messages)}`.trim();
    if (label.endsWith(unit)) return `${label.slice(0, -unit.length)} ${unitLabel(unit, messages)}`.trim();
  }
  return label;
}

const EMPTY_FORM = {
  name: "",
  doseLabel: "",
  dailyCount: "1",
  reminderTime: "",
  unit: "",
};

export default function SupplementPlanner() {
  const { t } = useUi();
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
    <section className="nv-card p-5" data-testid="supplement-planner">
      <h2 className="text-sm font-bold text-gray-900">{t.supplements.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.supplements.intro}</p>

      {items.length === 0 ? (
        <p className="nv-empty nv-inset mt-3 px-3 py-3 text-sm text-gray-600">
          {t.supplements.empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const taken = takenToday(item.id, log);
            return (
              <li key={item.id} className="nv-inset px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {format(t.supplements.schedule, { count: item.dailyCount })}
                      {item.doseLabel ? ` · ${format(t.supplements.dose, { dose: displayDose(item.doseLabel, t) })}` : ""}
                      {item.reminderTime ? ` · ${format(t.supplements.remindAt, { time: item.reminderTime })}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      {t.supplements.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSupplement(item.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      {t.common.remove}
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
                        className={`nv-chip px-3 py-1 text-xs font-medium ${
                          on
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {on ? format(t.supplements.taken, { n }) : format(t.supplements.missed, { n })}
                      </button>
                    );
                  })}
                  <span className="text-xs text-gray-500">
                    {format(t.supplements.today, { taken, total: item.dailyCount })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
        <h3 className="text-xs font-bold text-gray-800">{editingId ? t.supplements.editTitle : t.supplements.addTitle}</h3>
        <label className="block text-xs text-gray-500">
          {t.supplements.name}
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t.supplements.namePlaceholder}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-gray-500">
            {t.supplements.doseLabel}
            <span className="mt-1 flex gap-2">
              <input
                value={form.doseLabel}
                onChange={(e) => setForm((prev) => ({ ...prev, doseLabel: e.target.value }))}
                placeholder={t.supplements.dosePlaceholder}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
              />
              <select
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800"
              >
                <option value="">{t.supplements.unit}</option>
                {DOSE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unitLabel(unit, t)}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="block text-xs text-gray-500">
            {t.supplements.dailyCount}
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
          {t.supplements.time}
          <input
            type="time"
            value={form.reminderTime}
            onChange={(e) => setForm((prev) => ({ ...prev, reminderTime: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
          />
        </label>
        {error && <p className="nv-error text-xs">{localizeMessage(error, t)}</p>}
        <div className="flex gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="nv-btn-secondary flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {t.common.cancel}
            </button>
          )}
          <button
            type="submit"
            className="nv-btn flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            {editingId ? t.supplements.saveEdit : t.supplements.add}
          </button>
        </div>
      </form>
    </section>
  );
}
