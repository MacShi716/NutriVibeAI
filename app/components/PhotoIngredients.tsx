"use client";

import { useState } from "react";

/** 브라우저에서 긴 변을 1280px 이하 JPEG로 줄여 업로드 용량을 낮춘다 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export default function PhotoIngredients({ onAdd }: { onAdd: (names: string[]) => void }) {
  const [items, setItems] = useState<string[]>([]);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 선택할 수 있습니다.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("이미지 용량은 15MB 이하만 선택할 수 있습니다.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", await shrink(file), "photo.jpg");
      const res = await fetch("/api/vision", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "사진 인식에 실패했습니다.");
        return;
      }
      setItems(data.ingredients ?? []);
      setDemo(Boolean(data.demo));
      if ((data.ingredients ?? []).length === 0) setError("사진에서 식재료를 찾지 못했습니다.");
    } catch {
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해 주십시오.");
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "cursor-pointer rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100";

  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3" data-testid="photo-ingredients">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">📷 사진으로 식재료 인식</span>
        <label className={btn}>
          사진 업로드
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <label className={btn}>
          카메라 촬영
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {busy && <span className="text-xs text-gray-500">인식 중입니다…</span>}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        사진은 인식에만 사용되며 서버에 저장되지 않습니다. (최대 4MB, 큰 사진은 자동으로 축소됩니다)
      </p>
      {demo && items.length > 0 && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          데모 모드입니다. 비전 API 키가 설정되지 않아 예시 식재료 목록을 표시합니다.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {items.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {items.map((name) => (
              <span key={name} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                {name}
                <button type="button" aria-label={`${name} 삭제`} className="text-gray-400 hover:text-red-500" onClick={() => setItems(items.filter((x) => x !== name))}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
            onClick={() => { onAdd(items); setItems([]); setDemo(false); }}
          >
            보유 식재료에 추가
          </button>
        </div>
      )}
    </div>
  );
}
