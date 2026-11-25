"use client";

import Link from "next/link";
import ExpiryBanner from "@/components/ExpiryBanner";
import GameToast from "@/components/GameToast";
import LanguageSelect from "@/components/LanguageSelect";
import ReminderHost from "@/components/ReminderHost";
import RestrictionBadge from "@/components/RestrictionBadge";
import ThemeSwitch from "@/components/ThemeSwitch";
import VisitTracker from "@/components/VisitTracker";
import { useUi } from "./UiProvider";

function NavLinks({ stacked }: { stacked?: boolean }) {
  const { t } = useUi();
  const item = stacked ? "block py-1 hover:text-brand-600" : "whitespace-nowrap hover:text-brand-600";
  const play = stacked
    ? "mt-1 inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700 hover:bg-amber-200"
    : "whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700 hover:bg-amber-200";
  return (
    <>
      <Link href="/recipes" className={item}>
        {t.nav.recipes}
      </Link>
      <Link href="/meal-plan" className={item}>
        {t.nav.mealPlan}
      </Link>
      <Link href="/shopping-list" className={item}>
        {t.nav.shopping}
      </Link>
      <Link href="/supplements" className={item}>
        {t.nav.supplements}
      </Link>
      <Link href="/favorites" className={item}>
        {t.nav.favorites}
      </Link>
      <Link href="/profile" className={item}>
        {t.nav.profile}
      </Link>
      <Link href="/game" className={play}>
        {t.nav.game}
      </Link>
    </>
  );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const { t } = useUi();
  return (
    <>
      <VisitTracker />
      <GameToast />
      <header className="nv-chrome border-b">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                NV
              </span>
              <span className="text-lg font-bold text-brand-700">NutriVibe AI</span>
            </Link>
            <nav className="hidden min-[391px]:flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs font-medium text-gray-600 sm:gap-x-4 sm:text-sm">
              <NavLinks />
            </nav>
            <details className="relative min-[391px]:hidden">
              <summary className="cursor-pointer list-none rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 [&::-webkit-details-marker]:hidden">
                {t.nav.menu}
              </summary>
              <nav className="nv-chrome absolute right-0 z-20 mt-2 w-44 rounded-lg border p-3 text-sm font-medium shadow-sm">
                <div className="flex flex-col gap-1">
                  <NavLinks stacked />
                </div>
              </nav>
            </details>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <LanguageSelect />
            <ThemeSwitch />
          </div>
        </div>
      </header>
      <ExpiryBanner />
      <ReminderHost />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      <footer className="nv-chrome border-t py-6 text-center text-xs">
        <p>{t.footer.tagline}</p>
        <p className="mt-1">
          {t.footer.localBefore}{" "}
          <Link href="/profile#backup" className="font-medium text-brand-700 underline">
            {t.footer.backupLink}
          </Link>
        </p>
        <p className="mt-1">{t.footer.disclaimer}</p>
        <RestrictionBadge />
      </footer>
    </>
  );
}
