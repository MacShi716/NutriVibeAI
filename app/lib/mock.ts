import type { Recipe, UserConditions } from "./types";
import { splitIngredients } from "./shopping";
import { estimateNutrition } from "./nutrition";
import { translateToKorean } from "./alias";

/**
 * 데모 모드(mock) 레시피 규칙 엔진.
 * 실제 가정식 레시피 70여 종을 내장하고, 사용자가 입력한 보유 식재료가
 * 레시피 재료표에 포함된 레시피만을 골라 추천한다.
 * (예: 소고기 입력 → 소고기 장조림·불고기·소고기 야채볶음 등 실제 소고기 요리 추천)
 */

type Ing = { name: string; amount: string };

type Template = {
  /** 입력 식재료와 매칭되는 대표 키워드 */
  matches: string[];
  /** 동일 주재료 계열의 레시피가 과도하게 추천되지 않도록 구분하는 키워드 */
  main: string;
  /** meal(식사) / side(반찬) / snack(간식) / dessert(디저트) */
  category?: "meal" | "side" | "snack" | "dessert";
  title: string;
  desc: string;
  build: (s: number) => Ing[];
  steps: string[];
  cookMinutes: number;
};

export const TEMPLATES: Template[] = [
  // ===================== 소고기 =====================
  {
    matches: ["소고기"],
    main: "소고기",
    title: "불고기",
    desc: "간장·설탕·참기름 양념에 재운 소고기를 볶는 대표 한식",
    build: (s) => [
      { name: "소고기", amount: `${200 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "간장", amount: "2큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
      { name: "후추", amount: "약간" },
    ],
    steps: [
      "소고기에 간장·설탕·마늘·참기름·후추를 넣고 10분간 재운다.",
      "팬에 기름을 두르고 양파와 대파를 볶는다.",
      "양념한 소고기를 넣고 센 불에서 볶는다.",
      "고기가 익으면 참기름을 한 번 더 둘러 마무리한다.",
    ],
    cookMinutes: 20,
  },
  {
    matches: ["소고기"],
    main: "소고기",
    title: "소고기 야채볶음",
    desc: "소고기와 제철 채소를 볶은 간단한 한 접시 요리",
    build: (s) => [
      { name: "소고기", amount: `${150 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "당근", amount: "1/2개" },
      { name: "버섯", amount: "50g" },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "소고기와 채소를 한입 크기로 썬다.",
      "팬에 기름을 두르고 마늘과 소고기를 볶는다.",
      "양파·당근·버섯을 넣고 볶는다.",
      "간장으로 간하고 대파를 올려 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["소고기"],
    main: "소고기",
    title: "소고기 장조림",
    desc: "소고기를 간장 양념에 조린 짭조름한 밑반찬",
    build: (s) => [
      { name: "소고기", amount: `${200 * s}g` },
      { name: "마늘", amount: "2큰술" },
      { name: "대파", amount: "1/2대" },
      { name: "간장", amount: "4큰술" },
      { name: "설탕", amount: "1큰술" },
    ],
    steps: [
      "소고기를 한입 크기로 썰어 물에 데친다.",
      "냄비에 소고기와 물, 간장·설탕·마늘을 넣는다.",
      "약한 불에서 국물이 자작해질 때까지 조린다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 25,
  },
  {
    matches: ["소고기"],
    main: "소고기",
    title: "갈비탕",
    desc: "소갈비를 푹 끓여 깊은 국물의 구수한 탕",
    build: (s) => [
      { name: "소고기", amount: `${200 * s}g` },
      { name: "무", amount: `${100 * s}g` },
      { name: "대파", amount: "1대" },
      { name: "마늘", amount: "2큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "소고기를 찬물에 넣어 핏물을 뺀다.",
      "냄비에 소고기와 물을 붓고 끓인다.",
      "무와 마늘을 넣고 중불로 30분간 끓인다.",
      "대파와 소금으로 간해 마무리한다.",
    ],
    cookMinutes: 40,
  },
  {
    matches: ["소고기", "미역"],
    main: "소고기",
    title: "소고기미역국",
    desc: "미역과 소고기를 함께 끓인 보양 국",
    build: (s) => [
      { name: "소고기", amount: `${120 * s}g` },
      { name: "미역", amount: `${30 * s}g` },
      { name: "마늘", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "미역을 물에 불려 잘게 썬다.",
      "팬에 참기름을 두르고 소고기를 볶는다.",
      "미역을 넣고 함께 볶은 뒤 물을 붓는다.",
      "중불로 15분간 끓이고 소금으로 간한다.",
    ],
    cookMinutes: 25,
  },
  {
    matches: ["소고기", "당면"],
    main: "소고기",
    title: "잡채",
    desc: "소고기와 채소, 당면을 간장으로 무친 잔치 음식",
    build: (s) => [
      { name: "소고기", amount: `${100 * s}g` },
      { name: "당면", amount: `${80 * s}g` },
      { name: "시금치", amount: "50g" },
      { name: "당근", amount: "1/4개" },
      { name: "양파", amount: "1/2개" },
      { name: "간장", amount: "2큰술" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "당면을 삶아 간장과 참기름으로 버무린다.",
      "소고기와 채소를 각각 볶는다.",
      "모든 재료를 한 볼에 담아 간장·참기름으로 무친다.",
    ],
    cookMinutes: 30,
  },

  // ===================== 돼지고기 =====================
  {
    matches: ["돼지", "삼겹", "목살"],
    main: "돼지고기",
    title: "제육볶음",
    desc: "고추장 양념에 볶은 매콤달콤한 돼지고기 볶음",
    build: (s) => [
      { name: "돼지고기", amount: `${200 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "고추장", amount: "2큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "돼지고기에 고추장·간장·설탕·마늘·참기름을 넣고 버무린다.",
      "10분간 재운 고기를 팬에 볶는다.",
      "양파와 대파를 넣고 센 불에서 볶는다.",
      "국물이 자작해지면 마무리한다.",
    ],
    cookMinutes: 25,
  },
  {
    matches: ["돼지", "삼겹", "목살"],
    main: "돼지고기",
    title: "돼지고기 김치볶음",
    desc: "익은 김치와 돼지고기를 함께 볶은 얼큰한 요리",
    build: (s) => [
      { name: "돼지고기", amount: `${150 * s}g` },
      { name: "김치", amount: `${200 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "고추장", amount: "1큰술" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "돼지고기를 한입 크기로 썰고 김치는 속을 털어 썬다.",
      "팬에 기름을 두르고 돼지고기를 볶는다.",
      "김치와 고추장을 넣고 볶는다.",
      "양파와 대파를 넣어 마무리한다.",
    ],
    cookMinutes: 20,
  },
  {
    matches: ["돼지", "삼겹", "목살"],
    main: "돼지고기",
    title: "돼지고기 수육",
    desc: "돼지고기를 통째로 삶아 썬 담백한 수육",
    build: (s) => [
      { name: "돼지고기", amount: `${200 * s}g` },
      { name: "대파", amount: "1대" },
      { name: "마늘", amount: "2큰술" },
      { name: "소금", amount: "약간" },
      { name: "후추", amount: "약간" },
    ],
    steps: [
      "돼지고기를 찬물에 넣고 대파·마늘과 함께 삶는다.",
      "고기가 익으면 건져 얇게 썬다.",
      "소금과 후추를 곁들여 마무리한다.",
    ],
    cookMinutes: 30,
  },
  {
    matches: ["돼지", "삼겹", "목살"],
    main: "돼지고기",
    title: "돼지갈비찜",
    desc: "돼지갈비를 간장 양념에 푹 조린 짭조름한 찜",
    build: (s) => [
      { name: "돼지고기", amount: `${200 * s}g` },
      { name: "무", amount: `${80 * s}g` },
      { name: "간장", amount: "4큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "마늘", amount: "1큰술" },
      { name: "대파", amount: "1/2대" },
    ],
    steps: [
      "돼지고기를 찬물에 담가 핏물을 뺀다.",
      "간장·설탕·마늘·물로 양념장을 만든다.",
      "고기와 무, 양념장을 넣고 약한 불로 조린다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 35,
  },
  {
    matches: ["돼지", "삼겹", "목살", "감자"],
    main: "돼지고기",
    title: "감자탕",
    desc: "돼지고기와 감자를 매콤하게 끓인 얼큰한 탕",
    build: (s) => [
      { name: "돼지고기", amount: `${150 * s}g` },
      { name: "감자", amount: `${150 * s}g` },
      { name: "대파", amount: "1대" },
      { name: "고추장", amount: "1큰술" },
      { name: "고춧가루", amount: "1큰술" },
      { name: "마늘", amount: "1큰술" },
    ],
    steps: [
      "돼지고기를 한입 크기로 썰어 끓는 물에 데친다.",
      "냄비에 고기, 감자, 양념(고추장·고춧가루·마늘)을 넣는다.",
      "물을 붓고 25분간 끓인다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 35,
  },

  // ===================== 닭가슴살 =====================
  {
    matches: ["닭", "치킨"],
    main: "닭가슴살",
    title: "닭가슴살 볶음",
    desc: "담백한 닭가슴살과 채소를 볶은 다이어트 요리",
    build: (s) => [
      { name: "닭가슴살", amount: `${200 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "당근", amount: "1/2개" },
      { name: "버섯", amount: "50g" },
      { name: "마늘", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "닭가슴살을 한입 크기로 썰고 채소를 손질한다.",
      "팬에 기름을 두르고 마늘과 닭가슴살을 볶는다.",
      "양파·당근·버섯을 넣고 볶는다.",
      "간장으로 간하고 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["닭", "치킨"],
    main: "닭",
    title: "삼계탕",
    desc: "닭과 찹쌀, 대추를 넣고 푹 끓인 보양탕",
    build: (s) => [
      { name: "닭", amount: `${250 * s}g` },
      { name: "쌀", amount: `${40 * s}g` },
      { name: "대추", amount: "3개" },
      { name: "마늘", amount: "2큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "쌀을 불리고 닭은 손질한다.",
      "닭 속에 쌀·대추·마늘을 넣는다.",
      "냄비에 닭이 잠기도록 물을 붓고 푹 끓인다.",
      "소금으로 간하고 마무리한다.",
    ],
    cookMinutes: 45,
  },
  {
    matches: ["닭", "치킨"],
    main: "닭",
    title: "닭갈비",
    desc: "닭고기를 매콤한 양념에 볶은 강원도식 요리",
    build: (s) => [
      { name: "닭", amount: `${200 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "고추장", amount: "2큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
    ],
    steps: [
      "닭을 한입 크기로 썰어 고추장·간장·설탕에 버무린다.",
      "팬에 닭을 볶는다.",
      "양파와 대파를 넣고 익힌다.",
    ],
    cookMinutes: 25,
  },
  {
    matches: ["닭", "치킨"],
    main: "닭",
    title: "닭도리탕",
    desc: "닭과 감자, 채소를 얼큰하게 끓인 찜 요리",
    build: (s) => [
      { name: "닭", amount: `${200 * s}g` },
      { name: "감자", amount: `${100 * s}g` },
      { name: "당근", amount: "1/2개" },
      { name: "양파", amount: "1/2개" },
      { name: "고추장", amount: "2큰술" },
      { name: "고춧가루", amount: "1큰술" },
    ],
    steps: [
      "닭을 데치고 양념(고추장·고춧가루)을 만든다.",
      "냄비에 닭과 양념, 물을 넣고 끓인다.",
      "감자와 당근을 넣어 익힌다.",
      "양파를 넣고 국물이 자작해질 때까지 조린다.",
    ],
    cookMinutes: 35,
  },
  {
    matches: ["닭", "치킨"],
    main: "닭가슴살",
    title: "닭가슴살 샐러드",
    desc: "닭가슴살과 채소로 만든 가볍고 단백한 샐러드",
    build: (s) => [
      { name: "닭가슴살", amount: `${150 * s}g` },
      { name: "브로콜리", amount: "100g" },
      { name: "토마토", amount: "1개" },
      { name: "오이", amount: "1/2개" },
      { name: "올리브오일", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "닭가슴살을 삶아 결대로 찢는다.",
      "브로콜리를 데치고 토마토·오이를 썬다.",
      "모든 재료를 접시에 담는다.",
      "올리브오일과 소금으로 간한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["닭", "치킨"],
    main: "닭가슴살",
    title: "닭가슴살 스테이크",
    desc: "닭가슴살을 밑간해 구운 담백한 스테이크",
    build: (s) => [
      { name: "닭가슴살", amount: `${200 * s}g` },
      { name: "소금", amount: "약간" },
      { name: "후추", amount: "약간" },
      { name: "올리브오일", amount: "1큰술" },
    ],
    steps: [
      "닭가슴살에 소금과 후추로 밑간한다.",
      "팬에 올리브오일을 두르고 약한 불로 굽는다.",
      "노릇하게 익으면 먹기 좋게 썰어 마무리한다.",
    ],
    cookMinutes: 15,
  },

  // ===================== 쌀·계란 =====================
  {
    matches: ["쌀", "밥", "계란", "달걀"],
    main: "쌀",
    title: "계란 볶음밥",
    desc: "밥과 달걀로 15분 안에 만드는 간단 한 끼",
    build: (s) => [
      { name: "쌀", amount: `${150 * s}g` },
      { name: "달걀", amount: `${s}개` },
      { name: "대파", amount: "1/2대" },
      { name: "간장", amount: "1큰술" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "달걀을 풀고 대파를 송송 썬다.",
      "팬에 기름을 두르고 달걀을 스크램블한다.",
      "밥과 대파, 간장을 넣고 볶는다.",
      "그릇에 담아 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["쌀", "밥", "소고기"],
    main: "쌀",
    title: "비빔밥",
    desc: "밥 위에 나물과 고기, 달걀을 올려 고추장에 비벼 먹는 요리",
    build: (s) => [
      { name: "쌀", amount: `${150 * s}g` },
      { name: "소고기", amount: `${80 * s}g` },
      { name: "달걀", amount: `${s}개` },
      { name: "시금치", amount: "50g" },
      { name: "당근", amount: "1/4개" },
      { name: "고추장", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "밥을 짓고 채소와 소고기를 각각 볶는다.",
      "그릇에 밥을 담고 재료를 얹는다.",
      "달걀프라이를 올리고 고추장과 참기름을 곁들인다.",
    ],
    cookMinutes: 20,
  },
  {
    matches: ["쌀", "밥", "김"],
    main: "쌀",
    title: "김밥",
    desc: "김 위에 밥과 채소를 올려 돌돌 만 요리",
    build: (s) => [
      { name: "쌀", amount: `${150 * s}g` },
      { name: "달걀", amount: `${s}개` },
      { name: "당근", amount: "1/2개" },
      { name: "시금치", amount: "50g" },
      { name: "소금", amount: "약간" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "밥에 참기름과 소금을 섞는다.",
      "달걀지단과 채소를 준비한다.",
      "김 위에 밥과 재료를 올려 돌돌 만다.",
      "한입 크기로 썰어 담는다.",
    ],
    cookMinutes: 20,
  },
  {
    matches: ["계란", "달걀"],
    main: "계란",
    title: "계란말이",
    desc: "달걀에 채소를 넣고 돌돌 만 밑반찬",
    build: (s) => [
      { name: "달걀", amount: `${3 * s}개` },
      { name: "당근", amount: "1/4개" },
      { name: "대파", amount: "1/2대" },
      { name: "소금", amount: "약간" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "달걀을 풀어 소금으로 간하고 채소를 잘게 다진다.",
      "달걀물에 채소를 섞는다.",
      "팬에 얇게 부어 말아가며 익힌다.",
      "한입 크기로 썰어 담는다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["계란", "달걀"],
    main: "계란",
    title: "계란찜",
    desc: "부드럽게 쪄낸 따뜻한 달걀찜",
    build: (s) => [
      { name: "달걀", amount: `${3 * s}개` },
      { name: "대파", amount: "1/2대" },
      { name: "소금", amount: "약간" },
      { name: "참기름", amount: "1작은술" },
    ],
    steps: [
      "달걀을 풀어 물과 소금을 섞는다.",
      "냄비에 달걀물을 붓고 약한 불에서 저어가며 익힌다.",
      "대파와 참기름을 올려 마무리한다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["계란", "달걀"],
    main: "계란",
    title: "달걀국",
    desc: "달걀을 둥둥 띄운 따뜻하고 간단한 국",
    build: (s) => [
      { name: "달걀", amount: `${2 * s}개` },
      { name: "대파", amount: "1/2대" },
      { name: "간장", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "물 500ml를 끓이고 간장과 소금으로 간한다.",
      "달걀을 풀어 국물에 원을 그리며 넣는다.",
      "달걀이 익으면 대파를 올려 마무리한다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["김치"],
    main: "김치",
    title: "김치볶음밥",
    desc: "익은 김치와 밥을 볶아 만든 매콤한 볶음밥",
    build: (s) => [
      { name: "쌀", amount: `${150 * s}g` },
      { name: "김치", amount: `${150 * s}g` },
      { name: "달걀", amount: `${s}개` },
      { name: "고추장", amount: "1큰술" },
      { name: "대파", amount: "1/2대" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "김치를 잘게 썰고 대파를 송송 썬다.",
      "팬에 기름을 두르고 김치와 고추장을 볶는다.",
      "밥을 넣고 볶는다.",
      "달걀프라이를 올려 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["김치"],
    main: "김치",
    title: "김치전",
    desc: "김치를 달걀물에 버무려 부친 바삭한 전",
    build: (s) => [
      { name: "김치", amount: `${150 * s}g` },
      { name: "달걀", amount: `${s}개` },
      { name: "대파", amount: "1/2대" },
      { name: "소금", amount: "약간" },
      { name: "식용유", amount: "2큰술" },
    ],
    steps: [
      "김치를 잘게 썰고 대파를 송송 썬다.",
      "달걀물에 김치와 대파, 소금을 섞는다.",
      "팬에 기름을 두르고 얇게 부쳐 노릇하게 익힌다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["김치", "소시지", "햄"],
    main: "김치",
    title: "부대찌개",
    desc: "김치와 소시지, 햄을 넣고 얼큰하게 끓인 푸짐한 찌개",
    build: (s) => [
      { name: "김치", amount: `${150 * s}g` },
      { name: "소시지", amount: `${80 * s}g` },
      { name: "두부", amount: `${80 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "고추장", amount: "1큰술" },
    ],
    steps: [
      "김치를 먹기 좋게 썬다.",
      "냄비에 김치와 물, 고추장을 넣어 끓인다.",
      "소시지와 두부, 양파를 넣고 익힌다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 25,
  },
  {
    matches: ["김치", "참치"],
    main: "김치",
    title: "참치김치찌개",
    desc: "김치와 참치를 넣고 끓인 시원하고 얼큰한 찌개",
    build: (s) => [
      { name: "김치", amount: `${150 * s}g` },
      { name: "참치", amount: `${80 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "고추장", amount: "1큰술" },
    ],
    steps: [
      "김치를 썰고 냄비에 볶는다.",
      "물과 고추장을 넣어 끓인다.",
      "참치와 양파를 넣고 익힌다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 20,
  },

  // ===================== 두부·찌개 =====================
  {
    matches: ["된장"],
    main: "된장",
    title: "된장찌개",
    desc: "된장과 채소로 끓이는 얼큰한 국물 요리",
    build: (s) => [
      { name: "된장", amount: "2큰술" },
      { name: "두부", amount: `${150 * s}g` },
      { name: "감자", amount: "1개" },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
    ],
    steps: [
      "물 600ml에 된장을 풀어 끓인다.",
      "깍둑 썬 감자와 양파를 넣고 끓인다.",
      "두부를 넣고 5분 더 끓인다.",
      "대파를 올리고 마무리한다.",
    ],
    cookMinutes: 20,
  },
  {
    matches: ["고추장"],
    main: "고추장",
    title: "고추장찌개",
    desc: "고추장과 두부, 채소로 끓인 매콤한 찌개",
    build: (s) => [
      { name: "고추장", amount: "2큰술" },
      { name: "두부", amount: `${100 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
    ],
    steps: [
      "물 600ml에 고추장을 풀어 끓인다.",
      "두부와 양파를 넣고 익힌다.",
      "대파와 마늘을 넣어 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["김치"],
    main: "김치",
    title: "김치찌개",
    desc: "김치와 두부로 끓이는 얼큰한 찌개",
    build: (s) => [
      { name: "김치", amount: `${200 * s}g` },
      { name: "두부", amount: `${150 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "고추장", amount: "1큰술" },
    ],
    steps: [
      "김치를 한입 크기로 썬다.",
      "냄비에 김치와 고추장을 넣고 볶는다.",
      "물을 붓고 양파를 넣어 끓인다.",
      "두부를 넣고 대파를 올려 마무리한다.",
    ],
    cookMinutes: 20,
  },
  {
    matches: ["두부"],
    main: "두부",
    title: "두부부침",
    desc: "두부를 노릇하게 부쳐 양념장을 곁들인 반찬",
    build: (s) => [
      { name: "두부", amount: `${200 * s}g` },
      { name: "대파", amount: "1/2대" },
      { name: "간장", amount: "1큰술" },
      { name: "참기름", amount: "1작은술" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "두부를 먹기 좋게 썰어 물기를 뺀다.",
      "팬에 기름을 두르고 두부를 노릇하게 부친다.",
      "대파·간장·참기름을 섞어 양념장을 만든다.",
      "부친 두부에 양념장을 곁들인다.",
    ],
    cookMinutes: 12,
  },
  {
    matches: ["두부"],
    main: "두부",
    title: "두부조림",
    desc: "간장 양념에 조린 짭조름한 두부 반찬",
    build: (s) => [
      { name: "두부", amount: `${200 * s}g` },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "간장", amount: "2큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "두부를 두툼하게 썰어 팬에 지진다.",
      "간장·설탕·마늘·물을 섞어 양념장을 만든다.",
      "두부에 양념장을 붓고 조린다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["두부"],
    main: "두부",
    title: "두부찌개",
    desc: "두부와 채소를 넣고 끓인 담백한 찌개",
    build: (s) => [
      { name: "두부", amount: `${200 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "된장", amount: "1큰술" },
    ],
    steps: [
      "물 500ml에 된장을 풀어 끓인다.",
      "두부를 넣고 5분간 끓인다.",
      "양파와 대파를 넣어 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["두부"],
    main: "두부",
    title: "순두부찌개",
    desc: "부드러운 순두부와 조개를 넣어 끓인 얼큰한 찌개",
    build: (s) => [
      { name: "두부", amount: `${200 * s}g` },
      { name: "조개", amount: `${80 * s}g` },
      { name: "달걀", amount: `${s}개` },
      { name: "대파", amount: "1/2대" },
      { name: "고춧가루", amount: "1큰술" },
      { name: "마늘", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "팬에 참기름을 두르고 마늘과 고춧가루를 볶는다.",
      "물 500ml와 조개를 넣어 끓인다.",
      "순두부를 넣고 달걀을 풀어 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["두부", "김치"],
    main: "두부",
    title: "두부김치",
    desc: "두부를 지져 익은 김치와 곁들여 먹는 안주",
    build: (s) => [
      { name: "두부", amount: `${200 * s}g` },
      { name: "김치", amount: `${100 * s}g` },
      { name: "대파", amount: "1/2대" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "두부를 두툼하게 썰어 팬에 지진다.",
      "김치를 잘게 썰어 볶는다.",
      "접시에 두부와 김치를 담고 참기름을 뿌린다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["감자"],
    main: "감자",
    title: "감자 된장국",
    desc: "감자와 된장으로 끓이는 구수한 국",
    build: (s) => [
      { name: "감자", amount: `${2 * s}개` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "된장", amount: "2큰술" },
    ],
    steps: [
      "감자를 깍둑 썰고 양파를 채 썬다.",
      "물 700ml에 된장을 풀어 끓인다.",
      "감자와 양파를 넣고 익을 때까지 끓인다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 25,
  },

  // ===================== 생선·해산물 =====================
  {
    matches: ["고등어"],
    main: "고등어",
    title: "고등어 조림",
    desc: "간장 양념에 조린 감칠맛 나는 고등어 요리",
    build: (s) => [
      { name: "고등어", amount: `${200 * s}g` },
      { name: "감자", amount: "1개" },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "간장", amount: "2큰술" },
      { name: "고추장", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
    ],
    steps: [
      "고등어를 손질하고 채소를 썬다.",
      "간장·고추장·설탕·마늘·물을 섞어 양념을 만든다.",
      "냄비에 양념과 고등어, 채소를 넣고 조린다.",
      "국물이 자작해지면 마무리한다.",
    ],
    cookMinutes: 25,
  },
  {
    matches: ["고등어"],
    main: "고등어",
    title: "고등어 구이",
    desc: "소금 간만 한 고등어를 구운 담백한 반찬",
    build: (s) => [
      { name: "고등어", amount: `${200 * s}g` },
      { name: "소금", amount: "약간" },
      { name: "후추", amount: "약간" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "고등어에 소금과 후추로 밑간한다.",
      "팬에 기름을 두르고 약한 불에서 굽는다.",
      "노릇하게 구워지면 뒤집어 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["연어"],
    main: "연어",
    title: "연어 스테이크",
    desc: "연어를 구워 시금치와 곁들인 스테이크 요리",
    build: (s) => [
      { name: "연어", amount: `${200 * s}g` },
      { name: "시금치", amount: "100g" },
      { name: "소금", amount: "약간" },
      { name: "후추", amount: "약간" },
      { name: "올리브오일", amount: "1큰술" },
    ],
    steps: [
      "연어에 소금과 후추로 밑간한다.",
      "팬에 올리브오일을 두르고 연어를 굽는다.",
      "시금치를 살짝 데쳐 곁들인다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["연어"],
    main: "연어",
    title: "연어 샐러드",
    desc: "연어와 신선한 채소로 만든 가벼운 샐러드",
    build: (s) => [
      { name: "연어", amount: `${150 * s}g` },
      { name: "토마토", amount: "1개" },
      { name: "오이", amount: "1/2개" },
      { name: "올리브오일", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "연어를 한입 크기로 썬다.",
      "토마토와 오이를 썬다.",
      "모든 재료를 접시에 담고 올리브오일과 소금으로 간한다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["연어", "쌀"],
    main: "연어",
    title: "연어덮밥",
    desc: "구운 연어를 밥 위에 올린 담백한 덮밥",
    build: (s) => [
      { name: "연어", amount: `${120 * s}g` },
      { name: "쌀", amount: `${120 * s}g` },
      { name: "대파", amount: "1/2대" },
      { name: "간장", amount: "1큰술" },
    ],
    steps: [
      "연어에 소금을 뿌려 구운 뒤 먹기 좋게 썬다.",
      "밥을 그릇에 담고 연어를 올린다.",
      "간장과 대파를 곁들여 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["새우"],
    main: "새우",
    title: "새우 볶음",
    desc: "새우와 채소를 마늘 향으로 볶은 요리",
    build: (s) => [
      { name: "새우", amount: `${200 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "새우의 껍질과 내장을 정리한다.",
      "팬에 기름을 두르고 마늘을 볶는다.",
      "새우와 채소를 넣고 볶는다.",
      "간장으로 간하고 마무리한다.",
    ],
    cookMinutes: 12,
  },
  {
    matches: ["새우"],
    main: "새우",
    title: "새우 볶음밥",
    desc: "새우와 달걀로 볶은 고소한 볶음밥",
    build: (s) => [
      { name: "쌀", amount: `${150 * s}g` },
      { name: "새우", amount: `${100 * s}g` },
      { name: "달걀", amount: `${s}개` },
      { name: "대파", amount: "1/2대" },
      { name: "간장", amount: "1큰술" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "새우를 손질하고 대파를 송송 썬다.",
      "달걀을 스크램블한 뒤 새우를 볶는다.",
      "밥과 간장을 넣고 볶는다.",
      "대파를 넣고 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["오징어", "새우"],
    main: "오징어",
    title: "해물파전",
    desc: "오징어와 새우, 대파를 넣어 부친 바삭한 파전",
    build: (s) => [
      { name: "오징어", amount: `${80 * s}g` },
      { name: "새우", amount: `${60 * s}g` },
      { name: "대파", amount: "1대" },
      { name: "부침가루", amount: `${80 * s}g` },
      { name: "달걀", amount: `${s}개` },
      { name: "식용유", amount: "2큰술" },
    ],
    steps: [
      "오징어와 새우를 한입 크기로 썬다.",
      "부침가루와 달걀물, 대파, 해물을 섞는다.",
      "팬에 기름을 두르고 얇게 부쳐 노릇하게 익힌다.",
    ],
    cookMinutes: 20,
  },
  {
    matches: ["오징어"],
    main: "오징어",
    title: "오징어볶음",
    desc: "오징어와 채소를 매콤한 양념에 볶은 요리",
    build: (s) => [
      { name: "오징어", amount: `${150 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "당근", amount: "1/4개" },
      { name: "고추장", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
    ],
    steps: [
      "오징어를 먹기 좋게 썬다.",
      "양념(고추장·간장·설탕)을 만든다.",
      "팬에 오징어와 채소, 양념을 넣고 볶는다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["멸치"],
    main: "멸치",
    title: "멸치볶음",
    desc: "잔멸치를 간장에 볶아 만든 짭조름한 밑반찬",
    build: (s) => [
      { name: "멸치", amount: `${80 * s}g` },
      { name: "간장", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "팬에 멸치를 마른 불로 볶아 고소하게 만든다.",
      "간장과 설탕을 넣어 조린다.",
      "참기름을 넣어 마무리한다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["어묵"],
    main: "어묵",
    title: "어묵볶음",
    desc: "어묵과 채소를 매콤하게 볶은 간식 반찬",
    build: (s) => [
      { name: "어묵", amount: `${150 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "당근", amount: "1/4개" },
      { name: "간장", amount: "1큰술" },
      { name: "고추장", amount: "1큰술" },
    ],
    steps: [
      "어묵을 한입 크기로 썬다.",
      "팬에 어묵과 채소를 볶는다.",
      "간장과 고추장으로 양념해 마무리한다.",
    ],
    cookMinutes: 10,
  },

  // ===================== 채소 반찬 =====================
  {
    matches: ["감자"],
    main: "감자",
    title: "감자볶음",
    desc: "감자와 당근을 볶은 담백한 밑반찬",
    build: (s) => [
      { name: "감자", amount: `${2 * s}개` },
      { name: "당근", amount: "1/2개" },
      { name: "양파", amount: "1/2개" },
      { name: "소금", amount: "약간" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "감자와 당근을 채 썰고 양파를 썬다.",
      "팬에 기름을 두르고 감자를 볶는다.",
      "당근과 양파를 넣고 볶는다.",
      "소금으로 간하고 마무리한다.",
    ],
    cookMinutes: 12,
  },
  {
    matches: ["호박"],
    main: "호박",
    title: "호박볶음",
    desc: "애호박을 마늘과 함께 볶은 담백한 반찬",
    build: (s) => [
      { name: "호박", amount: `${200 * s}g` },
      { name: "마늘", amount: "1큰술" },
      { name: "소금", amount: "약간" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "호박을 반달 모양으로 썬다.",
      "팬에 참기름과 마늘을 볶는다.",
      "호박을 넣고 소금으로 간해 볶는다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["감자"],
    main: "감자",
    title: "감자전",
    desc: "감자를 갈아 부친 바삭한 부침개",
    build: (s) => [
      { name: "감자", amount: `${3 * s}개` },
      { name: "소금", amount: "약간" },
      { name: "식용유", amount: "2큰술" },
    ],
    steps: [
      "감자를 강판에 갈아 물기를 짠다.",
      "소금으로 간하고 팬에 얇게 펼친다.",
      "노릇하게 부쳐 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["시금치"],
    main: "시금치",
    title: "시금치 무침",
    desc: "데친 시금치를 참기름에 무친 기본 나물",
    build: (s) => [
      { name: "시금치", amount: `${200 * s}g` },
      { name: "마늘", amount: "1큰술" },
      { name: "대파", amount: "1/2대" },
      { name: "참기름", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "시금치를 끓는 물에 데친 뒤 찬물에 헹군다.",
      "물기를 짜고 먹기 좋게 자른다.",
      "마늘·대파·참기름·소금을 넣고 무친다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["시금치"],
    main: "시금치",
    title: "시금치 된장국",
    desc: "시금치와 된장으로 끓인 구수한 국",
    build: (s) => [
      { name: "시금치", amount: `${100 * s}g` },
      { name: "두부", amount: `${100 * s}g` },
      { name: "대파", amount: "1/2대" },
      { name: "된장", amount: "2큰술" },
    ],
    steps: [
      "시금치를 데쳐 물기를 짠다.",
      "물 600ml에 된장을 풀어 끓인다.",
      "두부와 시금치를 넣고 익힌다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["콩나물"],
    main: "콩나물",
    title: "콩나물 무침",
    desc: "아삭한 콩나물을 참기름에 무친 기본 반찬",
    build: (s) => [
      { name: "콩나물", amount: `${200 * s}g` },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "콩나물을 끓는 물에 데친다.",
      "물기를 빼고 대파·마늘을 다진다.",
      "참기름과 소금으로 무쳐 마무리한다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["콩나물"],
    main: "콩나물",
    title: "콩나물국",
    desc: "시원한 콩나물 국물 요리",
    build: (s) => [
      { name: "콩나물", amount: `${150 * s}g` },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
    ],
    steps: [
      "물 600ml를 끓이고 간장으로 간한다.",
      "콩나물과 마늘을 넣고 끓인다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["오이"],
    main: "오이",
    title: "오이 무침",
    desc: "아삭한 오이를 매콤하게 무친 반찬",
    build: (s) => [
      { name: "오이", amount: `${2 * s}개` },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "고추장", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "오이를 어슷썰어 소금에 잠시 절인다.",
      "물기를 짜고 대파·마늘을 다진다.",
      "고추장·설탕·참기름을 섞어 무친다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["오이"],
    main: "오이",
    title: "오이 샐러드",
    desc: "오이와 토마토로 만든 신선한 샐러드",
    build: (s) => [
      { name: "오이", amount: `${2 * s}개` },
      { name: "토마토", amount: "1개" },
      { name: "올리브오일", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "오이와 토마토를 썬다.",
      "접시에 담고 올리브오일과 소금으로 간한다.",
    ],
    cookMinutes: 5,
  },
  {
    matches: ["버섯"],
    main: "버섯",
    title: "버섯볶음",
    desc: "버섯과 채소를 간장 향으로 볶은 반찬",
    build: (s) => [
      { name: "버섯", amount: `${150 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "간장", amount: "1큰술" },
      { name: "식용유", amount: "1큰술" },
    ],
    steps: [
      "버섯을 먹기 좋게 찢고 채소를 썬다.",
      "팬에 기름을 두르고 버섯과 채소를 볶는다.",
      "간장으로 간하고 마무리한다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["버섯"],
    main: "버섯",
    title: "버섯 된장국",
    desc: "버섯과 된장으로 끓이는 구수한 국",
    build: (s) => [
      { name: "버섯", amount: `${100 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "된장", amount: "2큰술" },
    ],
    steps: [
      "버섯을 먹기 좋게 찢고 양파를 썬다.",
      "물 600ml에 된장을 풀어 끓인다.",
      "버섯과 양파를 넣고 익힌다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["배추"],
    main: "배추",
    title: "배추겉절이",
    desc: "신선한 배추를 양념에 버무린 겉절이",
    build: (s) => [
      { name: "배추", amount: `${200 * s}g` },
      { name: "대파", amount: "1/2대" },
      { name: "마늘", amount: "1큰술" },
      { name: "고추장", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "배추를 한입 크기로 썰어 소금에 절인다.",
      "물기를 짜고 대파·마늘을 다진다.",
      "고추장·간장·설탕·참기름을 넣어 버무린다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["배추"],
    main: "배추",
    title: "배추 된장국",
    desc: "배추와 된장으로 끓인 시원한 국",
    build: (s) => [
      { name: "배추", amount: `${150 * s}g` },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
      { name: "된장", amount: "2큰술" },
    ],
    steps: [
      "배추를 한입 크기로 썬다.",
      "물 600ml에 된장을 풀어 끓인다.",
      "배추와 양파를 넣고 익힌다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["브로콜리"],
    main: "브로콜리",
    title: "브로콜리 무침",
    desc: "데친 브로콜리를 참기름에 무친 반찬",
    build: (s) => [
      { name: "브로콜리", amount: `${200 * s}g` },
      { name: "마늘", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "브로콜리를 작은 송이로 잘라 데친다.",
      "물기를 빼고 마늘·참기름·소금으로 무친다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["브로콜리"],
    main: "브로콜리",
    title: "브로콜리 볶음",
    desc: "브로콜리를 마늘과 함께 볶은 건강 반찬",
    build: (s) => [
      { name: "브로콜리", amount: `${200 * s}g` },
      { name: "마늘", amount: "1큰술" },
      { name: "식용유", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "브로콜리를 작은 송이로 자른다.",
      "끓는 물에 1분간 데친다.",
      "팬에 기름과 마늘을 볶아 브로콜리를 넣는다.",
      "소금으로 간하고 마무리한다.",
    ],
    cookMinutes: 10,
  },

  // ===================== 면·기타 =====================
  {
    matches: ["파스타", "면"],
    main: "파스타면",
    title: "알리오 올리오 파스타",
    desc: "마늘과 올리브오일만으로 만드는 심플한 파스타",
    build: (s) => [
      { name: "파스타면", amount: `${80 * s}g` },
      { name: "마늘", amount: "2큰술" },
      { name: "올리브오일", amount: "2큰술" },
      { name: "소금", amount: "약간" },
      { name: "후추", amount: "약간" },
    ],
    steps: [
      "파스타면을 소금물에 삶는다.",
      "팬에 올리브오일과 마늘을 약한 불로 볶는다.",
      "삶은 면과 면수를 넣고 섞는다.",
      "후추를 뿌려 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["파스타", "면"],
    main: "파스타면",
    title: "토마토 파스타",
    desc: "토마토를 넣어 만든 담백한 파스타",
    build: (s) => [
      { name: "파스타면", amount: `${80 * s}g` },
      { name: "토마토", amount: "2개" },
      { name: "마늘", amount: "1큰술" },
      { name: "올리브오일", amount: "2큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "파스타면을 소금물에 삶는다.",
      "팬에 올리브오일과 마늘을 볶는다.",
      "토마토를 넣고 으깨며 소스로 만든다.",
      "삶은 면을 넣고 섞어 마무리한다.",
    ],
    cookMinutes: 20,
  },
  {
    matches: ["면", "소면"],
    main: "소면",
    title: "비빔국수",
    desc: "소면을 매콤새콤한 양념에 비벼 먹는 여름 별미",
    build: (s) => [
      { name: "소면", amount: `${100 * s}g` },
      { name: "오이", amount: "1/2개" },
      { name: "달걀", amount: `${s}개` },
      { name: "고추장", amount: "1큰술" },
      { name: "식초", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "소면을 삶아 찬물에 헹궈 물기를 뺀다.",
      "고추장·식초·설탕·참기름으로 양념장을 만든다.",
      "면에 양념장과 오이, 달걀을 올려 비빈다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["우동", "면"],
    main: "우동면",
    title: "우동",
    desc: "진한 국물에 우동면을 넣어 끓인 따뜻한 면 요리",
    build: (s) => [
      { name: "우동면", amount: `${150 * s}g` },
      { name: "대파", amount: "1/2대" },
      { name: "간장", amount: "2큰술" },
      { name: "달걀", amount: `${s}개` },
    ],
    steps: [
      "물 600ml에 간장으로 간해 끓인다.",
      "우동면을 넣고 익힌다.",
      "달걀과 대파를 넣어 마무리한다.",
    ],
    cookMinutes: 10,
  },
  {
    matches: ["떡"],
    main: "떡",
    category: "snack",
    title: "떡볶이",
    desc: "떡과 고추장 양념으로 만든 매콤한 간식",
    build: (s) => [
      { name: "떡", amount: `${200 * s}g` },
      { name: "고추장", amount: "2큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1/2대" },
    ],
    steps: [
      "떡을 물에 불린다.",
      "고추장·설탕·물을 섞어 양념을 만든다.",
      "양념을 끓인 뒤 떡과 채소를 넣는다.",
      "국물이 졸아들면 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["떡"],
    main: "떡",
    title: "떡국",
    desc: "떡과 달걀을 넣어 끓인 따뜻한 국",
    build: (s) => [
      { name: "떡", amount: `${150 * s}g` },
      { name: "달걀", amount: `${s}개` },
      { name: "대파", amount: "1/2대" },
      { name: "간장", amount: "1큰술" },
    ],
    steps: [
      "떡을 물에 불린다.",
      "물 700ml에 간장으로 간하고 떡을 넣어 끓인다.",
      "떡이 익으면 풀어 놓은 달걀을 넣는다.",
      "대파를 올려 마무리한다.",
    ],
    cookMinutes: 15,
  },
  {
    matches: ["바나나", "우유"],
    main: "과일",
    category: "dessert",
    title: "바나나 우유",
    desc: "바나나와 우유로 만드는 간단한 음료",
    build: (s) => [
      { name: "바나나", amount: `${s}개` },
      { name: "우유", amount: `${250 * s}ml` },
    ],
    steps: [
      "바나나를 깍둑썰어 믹서에 넣는다.",
      "우유를 붓고 곱게 갈아 마무리한다.",
    ],
    cookMinutes: 5,
  },
  {
    matches: ["사과", "바나나"],
    main: "과일",
    category: "dessert",
    title: "과일 샐러드",
    desc: "사과와 바나나를 곁들인 간단한 과일 샐러드",
    build: (s) => [
      { name: "사과", amount: `${s}개` },
      { name: "바나나", amount: `${s}개` },
    ],
    steps: [
      "사과를 깨끗이 씻어 한입 크기로 썬다.",
      "바나나를 어슷하게 썬다.",
      "과일을 그릇에 담아 마무리한다.",
    ],
    cookMinutes: 5,
  },
  {
    matches: ["참치", "쌀", "김"],
    main: "참치",
    title: "참치주먹밥",
    desc: "참치와 밥을 섞어 만든 간단한 주먹밥",
    build: (s) => [
      { name: "참치", amount: `${80 * s}g` },
      { name: "쌀", amount: `${150 * s}g` },
      { name: "소금", amount: "약간" },
      { name: "참기름", amount: "1큰술" },
    ],
    steps: [
      "참치와 밥, 소금, 참기름을 섞는다.",
      "한입 크기로 뭉쳐 주먹밥을 만든다.",
      "김을 곁들여 마무리한다.",
    ],
    cookMinutes: 10,
  },
];

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function includes(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na.includes(nb) || nb.includes(na);
}

function mk(
  i: number,
  c: UserConditions,
  title: string,
  desc: string,
  ingredients: Ing[],
  steps: string[],
  cookMinutes: number
): Recipe {
  const s = c.servings > 0 ? c.servings : 2;
  const t = c.cookMinutes > 0 ? c.cookMinutes : 20;
  const base: Recipe = {
    id: `m-${Date.now()}-${i}`,
    title,
    description: desc,
    ingredients,
    steps,
    cookMinutes: Math.min(cookMinutes, t),
    servings: s,
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  };
  const est = estimateNutrition(base);
  return { ...base, nutrition: { ...est, note: est.note } };
}

export function mockRecipes(c: UserConditions): {
  recipes: Recipe[];
  uncovered: string[];
} {
  // 사용자 입력(중국어 등)을 내장 라이브러리의 한글 재료명으로 정규화
  const owned = splitIngredients(c.ingredients).map(translateToKorean);
  const restricted = splitIngredients(c.restrictions).map(translateToKorean);

  // 제한 식재료는 후보에서 제외한다
  const usable = owned.filter(
    (x) => !restricted.some((r) => includes(x, r) || includes(r, x))
  );

  const scored = TEMPLATES.map((tmpl) => {
    const names = tmpl.build(c.servings).map((ing) => ing.name);
    // 사용자가 입력한 식재료가 이 레시피 재료표에 몇 개나 포함되는지 (0이면 추천 제외)
    const hits = names.filter((n) => usable.some((u) => includes(u, n))).length;
    // 대표 키워드(matches)에 걸리는 사용자 식재료 수
    const primary = tmpl.matches.filter((kw) =>
      usable.some((u) => includes(u, kw))
    ).length;
    // 주재료(main)가 사용자 입력에서 등장하는 순서 (빠를수록 우선)
    const mainIdx = usable.findIndex((u) => includes(u, tmpl.main));
    const mainRank = mainIdx >= 0 ? mainIdx : Number.MAX_SAFE_INTEGER;
    // 식사·반찬을 간식·디저트보다 우선 추천 (입력과 무관한 과일 샐러드 방지)
    const categoryRank =
      tmpl.category === "dessert" || tmpl.category === "snack" ? 1 : 0;
    return { tmpl, hits, primary, mainRank, categoryRank, total: names.length };
  });

  // 1) 사용자 식재료를 많이 포함할수록(전체 매칭), 2) 대표 키워드 매칭,
  // 3) 주재료가 입력에서 앞에 있을수록, 4) 식사·반찬 우선, 5) 재료 수가 적을수록
  scored.sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits;
    if (b.primary !== a.primary) return b.primary - a.primary;
    if (a.mainRank !== b.mainRank) return a.mainRank - b.mainRank;
    if (a.categoryRank !== b.categoryRank) return a.categoryRank - b.categoryRank;
    return a.total - b.total;
  });

  // ① 사용자가 입력한 식재료가 재료표에 포함된 레시피만 후보로 삼는다.
  const pool = scored.filter((s) => s.hits > 0);

  // ② 입력한 식재료 각각이 최소 하나의 레시피에 반영되도록(전체 매칭)
  //    우선순위가 높은 순서대로 하나씩 골라 담는다.
  const picked: Template[] = [];
  const covered = new Set<string>();
  for (const u of usable) {
    if (picked.length >= 3) break;
    if (covered.has(u)) continue;
    const idx = pool.findIndex((s) =>
      s.tmpl.build(c.servings).some((i) => includes(i.name, u))
    );
    if (idx < 0) continue;
    const t = pool[idx].tmpl;
    picked.push(t);
    pool.splice(idx, 1);
    const names = t.build(c.servings).map((i) => i.name);
    for (const uu of usable) {
      if (names.some((n) => includes(uu, n))) covered.add(uu);
    }
  }

  // ③ 3개가 안 차면 남은 고득점 레시피로 채운다.
  while (picked.length < 3 && pool.length > 0) {
    picked.push(pool.shift()!.tmpl);
  }

  // ④ 어떤 레시피에도 반영되지 못한 식재료(경고 안내용): 최종 선택본 기준으로 재계산
  const coveredFinal = new Set<string>();
  for (const t of picked) {
    const names = t.build(c.servings).map((i) => i.name);
    for (const u of usable) {
      if (names.some((n) => includes(u, n))) coveredFinal.add(u);
    }
  }
  const uncovered = usable.filter((u) => !coveredFinal.has(u));

  // ⑤ 일치하는 레시피가 없으면 빈 배열을 반환한다(프론트엔드에서 안내·검색 링크 표시).
  const recipes = picked.map((tmpl, i) =>
    mk(
      i,
      c,
      tmpl.title,
      tmpl.desc,
      tmpl.build(c.servings),
      tmpl.steps,
      tmpl.cookMinutes
    )
  );

  return { recipes, uncovered };
}
