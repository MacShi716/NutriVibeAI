"use client";

import { useRef, useState } from "react";
import {
  abandonForScroll,
  dragPos,
  shouldStartDrag,
  snapTheme,
  themePos,
} from "@/i18n/theme";
import { useUi } from "./UiProvider";

const THUMB = 48;
const INSET = 5;

type Drag = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: number;
  active: boolean;
};

const GRID = 18;

function PixelIcon({ kind }: { kind: "moon" | "sun" }) {
  const dots = kind === "moon" ? moonDots() : sunDots();
  const fill = kind === "moon" ? "#f7fbff" : "#2a241c";
  return (
    <svg className={`theme-switch__icon theme-switch__icon--${kind}`} viewBox={`0 0 ${GRID} ${GRID}`} aria-hidden="true">
      {dots.map((dot) => (
        <rect
          key={`${kind}-${dot.x}-${dot.y}-${dot.alpha}`}
          x={dot.x + 0.18}
          y={dot.y + 0.18}
          width="0.64"
          height="0.64"
          rx="0.08"
          fill={fill}
          opacity={dot.alpha}
        />
      ))}
    </svg>
  );
}

function moonDots(): { x: number; y: number; alpha: number }[] {
  const dots: { x: number; y: number; alpha: number }[] = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const dx = px - 7.6;
      const dy = py - 9;
      const disk = dx * dx + dy * dy <= 6.7 * 6.7;
      const cut = (px - 11.7) ** 2 + (py - 9) ** 2 <= 5.85 * 5.85;
      if (!disk) continue;
      if (!cut) dots.push({ x, y, alpha: 1 });
      else if ((x + y * 2) % 3 === 0) dots.push({ x, y, alpha: 0.3 });
    }
  }
  return dots;
}

function sunDots(): { x: number; y: number; alpha: number }[] {
  const dots: { x: number; y: number; alpha: number }[] = [];
  for (let y = 6; y <= 11; y += 1) {
    for (let x = 6; x <= 11; x += 1) dots.push({ x, y, alpha: 1 });
  }
  const rays: [number, number][] = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ];
  for (const [dx, dy] of rays) {
    for (const step of [4.1, 5.35, 6.45]) {
      const x = Math.round(8.5 + dx * step);
      const y = Math.round(8.5 + dy * step);
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      dots.push({ x, y, alpha: step > 6 ? 0.85 : 1 });
    }
  }
  return dots;
}

export default function ThemeSwitch() {
  const { theme, setTheme, t } = useUi();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);
  const posRef = useRef(themePos(theme));
  const skipClick = useRef(false);
  const epoch = useRef(0);
  const [inlinePos, setInlinePos] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  function travel(): number {
    const width = buttonRef.current?.clientWidth ?? THUMB + INSET * 2;
    return Math.max(1, width - THUMB - INSET * 2);
  }

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function commit(nextPos: number) {
    const next = snapTheme(nextPos);
    const token = epoch.current + 1;
    epoch.current = token;
    if (reduced()) {
      posRef.current = themePos(next);
      setInlinePos(null);
      setDragging(false);
      setTheme(next);
      return;
    }
    setDragging(false);
    window.requestAnimationFrame(() => {
      if (epoch.current !== token) return;
      posRef.current = themePos(next);
      setInlinePos(themePos(next));
      setTheme(next);
      window.setTimeout(() => {
        if (epoch.current === token) setInlinePos(null);
      }, 320);
    });
  }

  return (
    <button
      ref={buttonRef}
      id="theme-switch"
      type="button"
      role="switch"
      aria-checked={theme === "light"}
      aria-label={theme === "light" ? t.theme.day : t.theme.night}
      className={dragging ? "theme-switch is-dragging" : "theme-switch"}
      style={
        {
          "--thumb": `${THUMB}px`,
          "--inset": `${INSET}px`,
          ...(inlinePos === null ? {} : { "--pos": String(inlinePos) }),
        } as React.CSSProperties
      }
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        epoch.current += 1;
        drag.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          origin: inlinePos ?? themePos(theme),
          active: false,
        };
        posRef.current = inlinePos ?? themePos(theme);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const dx = event.clientX - current.startX;
        const dy = event.clientY - current.startY;
        if (!current.active) {
          if (abandonForScroll(dx, dy)) {
            drag.current = null;
            skipClick.current = true;
            return;
          }
          if (!shouldStartDrag(dx, dy)) return;
          current.active = true;
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        const next = dragPos(current.origin, dx, travel());
        posRef.current = next;
        setInlinePos(next);
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        drag.current = null;
        if (current.active) {
          skipClick.current = true;
          commit(posRef.current);
        }
      }}
      onPointerCancel={() => {
        const current = drag.current;
        drag.current = null;
        if (current?.active) {
          skipClick.current = true;
          commit(posRef.current);
        }
      }}
      onClick={() => {
        if (skipClick.current) {
          skipClick.current = false;
          return;
        }
        setTheme(theme === "light" ? "dark" : "light");
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          setTheme("dark");
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          setTheme("light");
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setTheme(theme === "light" ? "dark" : "light");
        }
      }}
    >
      <span className="theme-switch__track">
        <span className="theme-switch__glow" />
        <span className="theme-switch__thumb">
          <PixelIcon kind="moon" />
          <PixelIcon kind="sun" />
        </span>
      </span>
    </button>
  );
}
