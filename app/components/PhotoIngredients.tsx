"use client";

import { useState } from "react";
import { useUi } from "@/components/UiProvider";
import { format, localizeMessage } from "@/i18n/text";
import { ko } from "@/i18n/messages/ko";
import { translateToKorean } from "@/lib/alias";
import { requestVision } from "@/lib/client-api";

const MAX_ORIGINAL = 15 * 1024 * 1024;
const MAX_UPLOAD = 4 * 1024 * 1024;

/** 브라우저에서 긴 변을 1280px 이하 JPEG로 줄여 업로드 용량을 낮춘다. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export default function PhotoIngredients({
  onAdd,
}: {
  onAdd: (items: { name: string; amount: string }[]) => void;
}) {
  const { t } = useUi();
  const [items, setItems] = useState<{ name: string; amount: string }[]>([]);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      setError(ko.errors.imageOnly);
      return;
    }
    if (file.size > MAX_ORIGINAL) {
      setError(ko.errors.image15);
      return;
    }
    setBusy(true);
    try {
      const shrunk = await shrink(file);
      if (shrunk.size > MAX_UPLOAD) {
        setError(ko.errors.image4upload);
        return;
      }
      const body = new FormData();
      body.append("image", shrunk, "photo.jpg");
      const data = await requestVision(body);
      if (!data.ok) {
        setError(data.error);
        return;
      }
      const names = Array.from(new Set(data.ingredients.map((name) => translateToKorean(name)).filter(Boolean)));
      setItems(names.map((name) => ({ name, amount: "" })));
      setDemo(Boolean(data.demo));
      if (names.length === 0) setError(ko.errors.photoNone);
    } catch {
      setError(ko.errors.server);
    } finally {
      setBusy(false);
    }
  }

  function updateItem(index: number, field: "name" | "amount", value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function commit(allowEmptyAmount: boolean) {
    const next = items
      .map((item) => ({
        name: translateToKorean(item.name).replace(/[,，、]/g, " ").trim(),
        amount: item.amount.trim(),
      }))
      .filter((item) => item.name.length > 0);
    if (next.length === 0) {
      setError(ko.errors.photoNeedName);
      return;
    }
    if (!allowEmptyAmount && next.some((item) => !item.amount)) {
      setError(ko.errors.photoNeedAmount);
      return;
    }
    const unique = new Map<string, { name: string; amount: string }>();
    for (const item of next) unique.set(item.name, item);
    onAdd(Array.from(unique.values()));
    setItems([]);
    setDemo(false);
    setError("");
  }

  const btn =
    "cursor-pointer rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100";

  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3" data-testid="photo-ingredients">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{t.photo.title}</span>
        <label className={btn}>
          {t.photo.upload}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label className={btn}>
          {t.photo.camera}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {busy && <span className="text-xs text-gray-500">{t.photo.busy}</span>}
      </div>
      <p className="mt-1 text-xs text-gray-400">{t.photo.note}</p>
      {demo && items.length > 0 && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700" data-testid="photo-demo-notice">
          {t.photo.demo}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{localizeMessage(error, t)}</p>}
      {items.length > 0 && (
        <div className="mt-2">
          <p className="mb-2 text-xs text-gray-500">{t.photo.enterAmounts}</p>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`chip-${index}`}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-100 px-2 py-2 text-xs text-gray-700"
              >
                <input
                  aria-label={format(t.photo.recognized, { n: index + 1 })}
                  value={item.name}
                  onChange={(e) => updateItem(index, "name", e.target.value)}
                  className="min-w-[6rem] flex-1 rounded-md bg-white px-2 py-1 text-xs outline-none"
                />
                <input
                  aria-label={format(t.photo.amountLabel, { name: item.name || t.photo.ingredient })}
                  value={item.amount}
                  onChange={(e) => updateItem(index, "amount", e.target.value)}
                  placeholder={t.photo.amountPlaceholder}
                  className="w-28 rounded-md bg-white px-2 py-1 text-xs outline-none"
                />
                <button
                  type="button"
                  aria-label={format(t.photo.remove, { name: item.name || t.photo.ingredient })}
                  className="text-gray-400 hover:text-red-500"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
              onClick={() => commit(false)}
            >
              {t.photo.add}
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              onClick={() => commit(true)}
            >
              {t.photo.addNameOnly}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
