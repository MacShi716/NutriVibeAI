/** GitHub Pages 정적 빌드에서만 true. 같은 출처의 /api/* 는 없다. */
export const STATIC_HOST = process.env.NEXT_PUBLIC_STATIC_HOST === "true";

/** 브라우저가 호출하는 전용 중계 주소. 키는 넣지 않는다. */
export const RELAY_URL = (process.env.NEXT_PUBLIC_RELAY_URL ?? "").trim().replace(/\/+$/, "");

export const HAS_RELAY = RELAY_URL.length > 0;

/** 중계 또는 같은 출처 API로 원격 생성을 시도할 수 있는지. */
export const USES_REMOTE_AI = HAS_RELAY || !STATIC_HOST;
