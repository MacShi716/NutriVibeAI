import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import GameToast from "@/components/GameToast";
import VisitTracker from "@/components/VisitTracker";

export const metadata: Metadata = {
  title: "NutriVibe AI",
  description:
    "생성형 AI 기반 개인 맞춤 식단 기획 및 쇼핑리스트 웹 애플리케이션",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <VisitTracker />
        <GameToast />
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                NV
              </span>
              <span className="text-lg font-bold text-brand-700">NutriVibe AI</span>
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs font-medium text-gray-600 sm:gap-x-4 sm:text-sm">
              <Link href="/recipes" className="whitespace-nowrap hover:text-brand-600">
                레시피
              </Link>
              <Link href="/shopping-list" className="whitespace-nowrap hover:text-brand-600">
                쇼핑리스트
              </Link>
              <Link href="/favorites" className="whitespace-nowrap hover:text-brand-600">
                즐겨찾기·기록
              </Link>
              <Link href="/profile" className="whitespace-nowrap hover:text-brand-600">
                내 프로필
              </Link>
              <Link
                href="/game"
                className="whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700 hover:bg-amber-200"
              >
                놀이터 🎮
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
          <p>
            NutriVibe AI · 생성형 AI 기반 개인 맞춤 식단 및 쇼핑리스트 · MVP 데모
          </p>
          <p className="mt-1">
            영양 정보는 참고용이며, 알레르기·질환에 관한 판단은 의사 또는 영양사와 상담하세요.
          </p>
        </footer>
      </body>
    </html>
  );
}
