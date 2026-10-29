"use client";

import { useEffect, useRef, useState } from "react";

/** 숫자가 목표값까지 올라가는 카운트업 애니메이션 (UX 강조용) */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      setValue(target);
      return;
    }
    started.current = true;
    if (target <= 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
