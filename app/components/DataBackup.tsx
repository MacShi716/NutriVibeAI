"use client";

import { useState } from "react";
import { exportBackup, importBackup, parseBackup, toSyncCode } from "@/lib/backup";

export default function DataBackup() {
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");

  function download() {
    const b = exportBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `nutrivibe-backup-${b.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(`${Object.keys(b.data).length}개 항목을 파일로 내보냈습니다.`);
  }

  async function copyCode() {
    const c = toSyncCode(exportBackup());
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setMsg("동기화 코드를 클립보드에 복사했습니다. 다른 기기에서 붙여 넣으십시오.");
    } catch {
      setMsg("동기화 코드를 생성했습니다. 아래 코드를 직접 복사하십시오.");
    }
  }

  function restore(text: string) {
    try {
      const b = parseBackup(text);
      if (!window.confirm("현재 기기의 데이터를 가져온 데이터로 교체합니다. 계속하시겠습니까?")) return;
      const n = importBackup(b);
      setMsg(`${n}개 항목을 가져왔습니다. 화면을 새로 고칩니다.`);
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setMsg("올바른 백업 파일 또는 동기화 코드가 아닙니다.");
    }
  }

  const btn = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50";

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="data-backup">
      <h2 className="text-lg font-bold text-gray-900">데이터 백업 및 기기 간 이동</h2>
      <p className="mt-1 text-xs text-gray-500">
        계정 없이 프로필, 즐겨찾기·기록, 쇼핑리스트, 놀이터 기록 등을 다른 기기로 옮길 수 있습니다.
        데이터는 서버에 저장되지 않습니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={download}>JSON 파일로 내보내기</button>
        <label className={`${btn} cursor-pointer`}>
          JSON 파일 가져오기
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) restore(await f.text());
            }}
          />
        </label>
        <button type="button" className={btn} onClick={copyCode}>동기화 코드 만들기</button>
      </div>
      {code && (
        <textarea readOnly value={code} rows={3} className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 font-mono text-[10px] text-gray-600" />
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="다른 기기에서 만든 동기화 코드(NV1.…)를 붙여 넣으십시오"
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
