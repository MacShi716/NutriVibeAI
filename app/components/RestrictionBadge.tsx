"use client";

import { useEffect, useState } from "react";
import { CONDITIONS_EVENT, storage } from "@/lib/storage";

export default function RestrictionBadge() {
  const [text, setText] = useState("");

  useEffect(() => {
    const load = () => setText(storage.getConditions()?.restrictions?.trim() ?? "");
    load();
    window.addEventListener(CONDITIONS_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(CONDITIONS_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  if (!text) return null;

  return (
    <p className="mt-2 text-[11px] text-amber-700" data-testid="restriction-badge">
      기피·알레르기 적용 중: {text}
    </p>
  );
}
