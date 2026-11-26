"use client";

import { useUi } from "./UiProvider";

export default function LoadingLine() {
  const { t } = useUi();
  return (
    <div className="mx-auto max-w-2xl text-center text-sm text-gray-500">
      <p>{t.common.loading}</p>
      <div className="nv-skel mx-auto mt-3 h-2.5 w-40" aria-hidden="true" />
    </div>
  );
}
