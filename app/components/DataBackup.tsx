"use client";

import { useState } from "react";
import { useUi } from "@/components/UiProvider";
import { format } from "@/i18n/text";
import { exportBackup, importBackup, parseBackup, toSyncCode, type ImportMode } from "@/lib/backup";

export default function DataBackup() {
  const { t } = useUi();
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
    setMsg(format(t.backup.exported, { count: Object.keys(backup.data).length }));
  }

  async function copyCode() {
    const next = toSyncCode(exportBackup());
    setCode(next);
    try {
      await navigator.clipboard.writeText(next);
      setMsg(t.backup.copied);
    } catch {
      setMsg(t.backup.copyManual);
    }
  }

  function restore(text: string) {
    try {
      const backup = parseBackup(text);
      const ok = window.confirm(mode === "replace" ? t.backup.confirmReplace : t.backup.confirmMerge);
      if (!ok) return;
      const count = importBackup(backup, mode);
      setMsg(
        format(t.backup.restored, {
          count,
          mode: mode === "replace" ? t.backup.modeReplace : t.backup.modeMerge,
        })
      );
      window.setTimeout(() => window.location.reload(), 800);
    } catch {
      setMsg(t.backup.invalid);
    }
  }

  const btn = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50";

  return (
    <div id="backup" className="mt-6 scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="data-backup">
      <h2 className="text-lg font-bold text-gray-900">{t.backup.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.backup.intro}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-gray-600">
        <li>{t.backup.step1}</li>
        <li>{t.backup.step2}</li>
        <li>{t.backup.step3}</li>
      </ol>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
        <label className="flex items-center gap-1">
          <input type="radio" name="backup-mode" checked={mode === "merge"} onChange={() => setMode("merge")} />
          {t.backup.merge}
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" name="backup-mode" checked={mode === "replace"} onChange={() => setMode("replace")} />
          {t.backup.replace}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={download}>
          {t.backup.download}
        </button>
        <label className={`${btn} cursor-pointer`}>
          {t.backup.upload}
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
          {t.backup.makeCode}
        </button>
      </div>
      {code && (
        <textarea
          readOnly
          value={code}
          rows={3}
          aria-label={t.backup.codeLabel}
          className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 font-mono text-[10px] text-gray-600"
        />
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.backup.placeholder}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs"
        />
        <button type="button" className={btn} disabled={!input.trim()} onClick={() => restore(input)}>
          {t.backup.importCode}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-brand-700">{msg}</p>}
    </div>
  );
}
