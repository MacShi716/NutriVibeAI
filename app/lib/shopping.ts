import type { RecipeIngredient } from "./types";
import { translateToKorean } from "./alias";

export type ShoppingItem = {
  name: string;
  amount: string;
  checked: boolean;
};

/** 보유 식재료 목록(쉼표 구분 문자열)을 정규화한다 */
export function splitIngredients(raw: string): string[] {
  return raw
    .split(/[,，、\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function normalize(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

/** 레시피 재료 - 보유 식재료 = 누락(구매 필요) 항목 계산 */
export function buildShoppingList(
  recipeIngredients: RecipeIngredient[],
  ownedRaw: string
): ShoppingItem[] {
  const owned = splitIngredients(ownedRaw).map(translateToKorean);
  return recipeIngredients
    .filter((ing) => {
      const name = normalize(ing.name);
      return !owned.some((o) => o.includes(name) || name.includes(o));
    })
    .map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      checked: false,
    }));
}

/** 여러 레시피의 쇼핑리스트를 병합(중복 제거) */
export function mergeShoppingItems(items: ShoppingItem[][]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const list of items) {
    for (const item of list) {
      const key = normalize(item.name);
      const prev = map.get(key);
      if (prev) {
        if (!prev.amount.includes(item.amount)) {
          prev.amount = `${prev.amount} + ${item.amount}`;
        }
      } else {
        map.set(key, { ...item });
      }
    }
  }
  return Array.from(map.values());
}

/** 구매 항목을 식품군별로 분류한다 (쇼핑 편의용) */
const CATEGORY_RULES: { key: string; label: string; words: string[] }[] = [
  { key: "meat", label: "육류·난류", words: ["닭", "소고기", "돼지", "삼겹살", "목살", "계란", "달걀", "베이컨", "소시지", "햄"] },
  { key: "seafood", label: "해산물", words: ["새우", "오징어", "조개", "생선", "고등어", "연어", "참치", "멸치", "굴", "홍합", "게"] },
  { key: "veggie", label: "채소·과일", words: ["양파", "감자", "당근", "대파", "마늘", "브로콜리", "토마토", "배추", "시금치", "상추", "양배추", "오이", "호박", "가지", "고추", "버섯", "애호박", "무", "사과", "바나나", "레몬"] },
  { key: "sauce", label: "장류·조미료", words: ["간장", "된장", "고추장", "소금", "설탕", "식용유", "올리브오일", "참기름", "들기름", "후추", "식초", "미림", "굴소스", "케첩", "마요네즈", "고춧가루"] },
  { key: "dairy", label: "유제품", words: ["우유", "치즈", "버터", "요거트", "생크림"] },
  { key: "grain", label: "곡물·건조식품", words: ["쌀", "밥", "면", "국수", "파스타", "밀가루", "빵", "두부", "콩", "견과", "땅콩", "아몬드", "김", "미역", "다시마"] },
];

function categorizeItem(name: string): { key: string; label: string } {
  const n = normalize(name);
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((w) => n.includes(w) || w.includes(n))) {
      return { key: rule.key, label: rule.label };
    }
  }
  return { key: "etc", label: "기타" };
}

/** 항목을 분류 순서대로 그룹핑한다 */
export function groupShoppingItems(
  items: ShoppingItem[]
): { key: string; label: string; items: ShoppingItem[] }[] {
  const groups = new Map<string, { key: string; label: string; items: ShoppingItem[] }>();
  const order = CATEGORY_RULES.map((r) => r.key);
  order.push("etc");
  for (const key of order) groups.set(key, { key, label: "", items: [] });

  for (const item of items) {
    const { key, label } = categorizeItem(item.name);
    const g = groups.get(key)!;
    g.label = label;
    g.items.push(item);
  }
  return Array.from(groups.values()).filter((g) => g.items.length > 0);
}

/** 레시피에서 보유 식재료가 차지하는 비율(%)을 계산한다 (연동 표시용) */
export function calcOwnedUsage(
  recipeIngredients: RecipeIngredient[],
  ownedRaw: string
): { used: number; total: number; pct: number } {
  const owned = splitIngredients(ownedRaw).map(translateToKorean);
  let used = 0;
  for (const ing of recipeIngredients) {
    const name = normalize(ing.name);
    if (owned.some((o) => o.includes(name) || name.includes(o))) used += 1;
  }
  const total = recipeIngredients.length;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return { used, total, pct };
}
