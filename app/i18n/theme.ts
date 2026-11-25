/**
 * Day/night preference. Stored only in this browser, outside the nutrivibe:
 * backup prefix, so a data export does not upload or overwrite it.
 *
 * When nothing is stored, follow prefers-color-scheme. If the system does not
 * request dark, the site stays light — the appearance this app shipped with.
 * Clearing site data removes the stored choice and returns to that rule.
 */

export const THEME_STORAGE_KEY = "nv-ui-theme";
export const LOCALE_STORAGE_KEY = "nv-ui-locale";

export const DRAG_THRESHOLD_PX = 10;

export type ThemeChoice = "light" | "dark";

export function parseTheme(value: string | null): ThemeChoice | null {
  if (value === "light" || value === "dark") return value;
  return null;
}

/** Stored choice wins. Otherwise follow the system, and light when it is not dark. */
export function resolveTheme(stored: string | null, prefersDark: boolean): ThemeChoice {
  const choice = parseTheme(stored);
  if (choice) return choice;
  return prefersDark ? "dark" : "light";
}

export function themePos(theme: ThemeChoice): number {
  return theme === "light" ? 1 : 0;
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Thumb travel follows the finger. Night is 0 (left), day is 1 (right). */
export function dragPos(startPos: number, dx: number, travel: number): number {
  if (!(travel > 0)) return clamp01(startPos);
  return clamp01(startPos + dx / travel);
}

/** Horizontal movement past the threshold, and more horizontal than vertical. */
export function shouldStartDrag(dx: number, dy: number): boolean {
  return Math.abs(dx) >= DRAG_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy);
}

/** Vertical movement wins: let the page scroll and do not capture the pointer. */
export function abandonForScroll(dx: number, dy: number): boolean {
  return Math.abs(dy) >= DRAG_THRESHOLD_PX && Math.abs(dy) >= Math.abs(dx);
}

export function snapTheme(pos: number): ThemeChoice {
  return pos >= 0.5 ? "light" : "dark";
}

export function readStoredTheme(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode can reject storage. The in-memory choice still applies.
  }
}

export function applyTheme(theme: ThemeChoice): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

/**
 * Blocking head/body script. Reads the stored theme before first paint.
 * prefers-color-scheme is consulted only when no stored choice exists.
 */
export const BOOT_SCRIPT = `(function(){try{var tk=${JSON.stringify(THEME_STORAGE_KEY)};var lk=${JSON.stringify(LOCALE_STORAGE_KEY)};var t=localStorage.getItem(tk);var theme=(t==="light"||t==="dark")?t:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var root=document.documentElement;root.setAttribute("data-theme",theme);root.style.colorScheme=theme;var l=localStorage.getItem(lk);var locale=(l==="ko"||l==="zh"||l==="en")?l:"ko";root.setAttribute("data-locale",locale);root.lang=locale==="zh"?"zh-CN":locale==="en"?"en":"ko";}catch(e){}})();`;
