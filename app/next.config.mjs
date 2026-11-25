/** @type {import('next').NextConfig} */
const pages = process.env.GITHUB_PAGES === "true";
const basePath = "/NutriVibeAI";

/** GitHub Pages 빌드에서만 정적 내보내기. Vercel 백업은 기존 서버 빌드(API 라우트 포함)를 유지한다. */
const nextConfig = {
  reactStrictMode: true,
  ...(pages
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
