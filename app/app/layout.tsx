import type { Metadata } from "next";
import "./golden-ratio.css";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { UiProvider } from "@/components/UiProvider";
import { BOOT_SCRIPT } from "@/i18n/theme";

export const metadata: Metadata = {
  title: "NutriVibe AI",
  description: "생성형 AI 기반 개인 맞춤 식단 기획 및 쇼핑리스트 웹 애플리케이션",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="nv-page min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        <UiProvider>
          <SiteChrome>{children}</SiteChrome>
        </UiProvider>
      </body>
    </html>
  );
}
