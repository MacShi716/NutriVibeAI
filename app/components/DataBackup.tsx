"use client";

import { useState } from "react";
import { exportBackup, importBackup, parseBackup, toSyncCode, type ImportMode } from "@/lib/backup";

export default function DataBackup() {
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ImportMode>("merge");
  const [msg, setMsg] = useState("");

  function download() {
    const backup = exportBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `nutrivibe-backup-${backup.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(`${Object.keys(backup.data).length}개 항목을 파일로 내보냈습니다.`);
  }

  async function copyCode() {
    const next = toSyncCode(exportBackup());
    setCode(next);
    try {
      await navigator.clipboard.writeText(next);
      setMsg("동기화 코드를 클립보드에 복사했습니다. 다른 기기에 붙여 넣어 주세요.");
    } catch {
      setMsg("동기화 코드를 만들었습니다. 아래 코드를 직접 복사해 주세요.");
    }
  }

  function restore(text: string) {
    try {
      const backup = parseBackup(text);
      const ok = window.confirm(
        mode === "replace"
          ? "이 기기의 NutriVibe 데이터를 지우고 가져온 데이터로 바꿉니다. 계속할까요?"
          : "두 기기의 데이터를 합칩니다. 즐겨찾기·기록·쇼핑리스트·놀이터·주간 식단·유통기한은 서로 합치고, 프로필은 더 최근에 저장한 쪽을 유지합니다. 계속할까요?"
      );
      if (!ok) return;
      const count = importBackup(backup, mode);
      setMsg(`${count}개 항목을 ${mode === "replace" ? "교체" : "병합"}했습니다. 화면을 새로 고칩니다.`);
      window.setTimeout(() => window.location.reload(), 800);
    } catch {
      setMsg("올바른 백업 파일 또는 동기화 코드가 아닙니다.");
    }
  }

  const btn = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50";

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="data-backup">
      <h2 className="text-lg font-bold text-gray-900">데이터 백업 및 기기 간 이동</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        로그인 없이 프로필(단백질 목표 포함), 즐겨찾기·기록, 쇼핑리스트, 포인트·레벨·업적·도감, 주간 식단, 식재료
        유통기한을 다른 기기로 옮길 수 있습니다. 데이터는 서버에 저장되지 않습니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="backup-mode"
            checked={mode === "merge"}
            onChange={() => setMode("merge")}
          />
          병합
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="backup-mode"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          교체
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={download}>
          JSON 파일로 내보내기
        </button>
        <label className={`${btn} cursor-pointer`}>
          JSON 파일 가져오기
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void file.text().then(restore);
            }}
          />
        </label>
        <button type="button" className={btn} onClick={() => void copyCode()}>
          동기화 코드 만들기
        </button>
      </div>
      {code && (
        <textarea
          readOnly
          value={code}
          rows={3}
          aria-label="동기화 코드"
          className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 font-mono text-[10px] text-gray-600"
        />
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="다른 기기의 동기화 코드(NV1.…)를 붙여 넣으세요"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs"
        />
        <button type="button" className={btn} disabled={!input.trim()} onClick={() => restore(input)}>
          코드로 가져오기
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-brand-700">{msg}</p>}
    </div>
  );
}
