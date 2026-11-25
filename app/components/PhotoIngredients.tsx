"use client";

import { useState } from "react";
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

export default function PhotoIngredients({ onAdd }: { onAdd: (names: string[]) => void }) {
  const [items, setItems] = useState<string[]>([]);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      setError("이미지 파일만 선택할 수 있습니다.");
      return;
    }
    if (file.size > MAX_ORIGINAL) {
      setError("이미지 용량은 15MB 이하만 선택할 수 있습니다.");
      return;
    }
    setBusy(true);
    try {
      const shrunk = await shrink(file);
      if (shrunk.size > MAX_UPLOAD) {
        setError("이미지 용량은 4MB 이하만 업로드할 수 있습니다. 더 작은 사진을 선택해 주세요.");
        return;
      }
      const body = new FormData();
      body.append("image", shrunk, "photo.jpg");
      const data = await requestVision(body);
      if (!data.ok) {
        setError(data.error);
        return;
      }
      const names = data.ingredients.map((name) => translateToKorean(name)).filter(Boolean);
      setItems(Array.from(new Set(names)));
      setDemo(Boolean(data.demo));
      if (names.length === 0) setError("사진에서 식재료를 찾지 못했습니다.");
    } catch {
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((name, i) => (i === index ? value : name)));
  }

  function commit() {
    const names = items
      .map((name) => translateToKorean(name).replace(/[,，、]/g, " ").trim())
      .filter((name) => name.length > 0);
    if (names.length === 0) {
      setError("추가할 식재료 이름을 입력해 주세요.");
      return;
    }
    onAdd(Array.from(new Set(names)));
    setItems([]);
    setDemo(false);
  }

  const btn =
    "cursor-pointer rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100";

  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3" data-testid="photo-ingredients">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">사진으로 식재료 인식</span>
        <label className={btn}>
          사진 업로드
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
          카메라 촬영
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
        {busy && <span className="text-xs text-gray-500">인식 중입니다…</span>}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        사진은 인식에만 쓰이며 서버에 저장하지 않습니다. 큰 사진은 자동으로 줄이고, 4MB를 넘으면 업로드할 수 없습니다.
      </p>
      {demo && items.length > 0 && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700" data-testid="photo-demo-notice">
          예시 식재료입니다. 지금은 사진 속 재료를 온라인으로 인식하지 않습니다.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {items.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {items.map((name, index) => (
              <span
                key={`chip-${index}`}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
              >
                <input
                  aria-label={`인식된 식재료 ${index + 1}`}
                  value={name}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="w-20 bg-transparent text-xs outline-none"
                  style={{ width: `${Math.max(name.length, 2)}ch` }}
                />
                <button
                  type="button"
                  aria-label={`${name || "식재료"} 삭제`}
                  className="text-gray-400 hover:text-red-500"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
            onClick={commit}
          >
            보유 식재료에 추가
          </button>
        </div>
      )}
    </div>
  );
}
