/** 식사 인원 허용 범위 (서버·클라이언트 공통) */
export const SERVINGS_MIN = 1;
export const SERVINGS_MAX = 12;
export const SERVINGS_ERROR = `식사 인원은 ${SERVINGS_MIN}~${SERVINGS_MAX}명 사이의 정수로 입력해 주십시오. 대량 조리는 ${SERVINGS_MAX}인분 기준으로 생성한 뒤 배수로 늘려 주십시오.`;

export function isValidServings(n: number): boolean {
  return Number.isInteger(n) && n >= SERVINGS_MIN && n <= SERVINGS_MAX;
}
