/** GitHub Pages 정적 빌드에서만 true. 서버 빌드는 키가 있으면 Groq를 기본으로 호출한다. */
export const STATIC_HOST = process.env.NEXT_PUBLIC_STATIC_HOST === "true";
