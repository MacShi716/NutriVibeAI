/** 다이닝코드 공개 검색 URL. 비공개 API는 사용하지 않는다. */

export const DININGCODE_HOME = "https://www.diningcode.com/";

/** 확인된 공개 검색 주소: /list.dc?query=검색어 */
export function diningCodeSearchUrl(query: string): string {
  const q = query.trim();
  if (!q) return DININGCODE_HOME;
  return `https://www.diningcode.com/list.dc?query=${encodeURIComponent(q)}`;
}

/** 지역·음식 종류만 안내하는 예시 검색어. 개인 취향 기본값은 넣지 않는다. */
export const DININGCODE_SUGGESTIONS = ["한식", "점심", "분식", "백반"] as const;
