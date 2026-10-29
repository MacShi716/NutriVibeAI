# -*- coding: utf-8 -*-
"""Build NutriVibe AI project plan report: PDF (reportlab) + DOCX (python-docx)."""
import os
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.environ.get("NV_OUT_DIR", os.path.dirname(BASE))
# Personal info (name / student ID) is not hard-coded; pass it via environment variables.
STUDENT_NAME = os.environ.get("NV_STUDENT_NAME", "")
STUDENT_ID = os.environ.get("NV_STUDENT_ID", "")
REPORT_NAME = os.environ.get("NV_REPORT_NAME", "NutriVibeAI_report")
PDF_PATH = os.path.join(OUT_DIR, REPORT_NAME + ".pdf")
DOCX_PATH = os.path.join(OUT_DIR, REPORT_NAME + ".docx")
FIG1 = os.path.join(BASE, "fig1_flow.png")
FIG2 = os.path.join(BASE, "fig2_arch.png")

FONT_DIR = os.environ.get("NV_FONT_DIR", os.path.join(os.environ.get("WINDIR", ""), "Fonts"))
FONT_REG = os.path.join(FONT_DIR, "malgun.ttf")
FONT_BOLD = os.path.join(FONT_DIR, "malgunbd.ttf")

# ============================================================ CONTENT
COVER_TITLE = "생성형 AI 기반 Agentic Coding(Vibe Coding)<br/>프로젝트 기획 및 개발 계획서"
COVER_PROJ = "프로젝트명: NutriVibe AI"
COVER_TYPE = "생성형 AI 기반 개인 맞춤 식단 기획 및 쇼핑리스트 웹 애플리케이션"
COVER_DATE = "제출일: 2026년 10월"

TOC = [
    "1. 시스템 개요",
    "2. 상세 기능 명세",
    "3. Agentic & Vibe Coding 도구 활용 전략",
    "4. 프롬프트 엔지니어링 및 컨텍스트 관리 전략",
    "5. 개발 로드맵 및 일정 계획(WBS)",
    "6. 프로젝트 요약 및 확장 계획",
]

# ITEMS: ("h1"|"h2"|"p"|"bullets"|"nums"|"table"|"fig"|"box"|"toc"|"pagebreak", payload)
ITEMS = [
    ("h1", "1. 시스템 개요"),
    ("h2", "1.1 프로젝트 기본 정의"),
    ("p", "NutriVibe AI는 생성형 AI(Gemini API)를 활용하여 사용자 개인 조건에 맞는 식단을 제안하고, 요리에 필요한 쇼핑리스트를 자동으로 생성하는 웹 애플리케이션이다. 본 프로젝트는 Vibe Coding 방식, 즉 자연어 기반의 대화와 AI 코딩 도구를 활용하여 소프트웨어를 신속하게 설계하고 구현하는 개발 방식을 적용할 계획이다."),
    ("p", "사용자는 보유 식재료, 식습관, 기피 및 알레르기 정보, 식사 인원, 조리 시간을 입력한다. 시스템은 이를 바탕으로 Gemini API를 호출하여 2~3개의 가정식 레시피를 생성하고, 누락된 식재료를 자동으로 정리하여 쇼핑리스트를 제공한다."),
    ("p", "본 문서는 NutriVibe AI의 기획 내용과 개발 계획을 정리한 프로젝트 개발 계획서이다. 현재 MVP 핵심 기능이 로컬 환경에서 구현되어 동작 중이며, 본 문서는 초기 기획 내용과 개발 진행 상황을 함께 제시한다."),

    ("h2", "1.2 개발 배경 및 문제 정의"),
    ("p", "대학생과 직장인 등 일반 사용자는 식사 준비 과정에서 다음과 같은 어려움을 경험한다."),
    ("bullets", [
        "메뉴 결정 부담: 매일 '오늘 무엇을 먹을까'를 결정하는 데 시간을 소비하며, 반복적인 메뉴 결정에 피로감을 느낀다.",
        "식재료 낭비: 냉장고에 남아 있는 식재료를 제때 활용하지 못하여 유통기한 경과로 폐기되는 경우가 많다.",
        "정보 분산: 레시피 탐색과 장보기 과정이 분리되어 있어 요리 후에도 부족한 식재료를 빠짐없이 구매하기 어렵고, 레시피와 쇼핑리스트가 여러 서비스에 흩어져 있어 관리가 번거롭다.",
        "개인 조건 미반영: 기존 레시피 서비스는 사용자의 보유 식재료, 알레르기, 조리 시간 등 개인 조건을 충분히 반영하지 못하는 경우가 많다.",
    ]),

    ("h2", "1.3 목표 사용자 및 기대 효과"),
    ("p", "목표 사용자는 다음과 같다. 대학생, 바쁜 직장인, 자취생, 가정에서 간단히 요리하는 사용자, 식단 관리가 필요한 일반 사용자."),
    ("p", "기대 효과는 다음과 같다."),
    ("bullets", [
        "메뉴 결정에 소요되는 시간을 줄여준다.",
        "보유 식재료를 우선 활용할 수 있도록 안내한다.",
        "식재료 낭비를 줄이는 데 기여한다.",
        "누락 없는 쇼핑리스트 자동 생성으로 장보기의 편의성을 높인다.",
        "PC와 모바일에서 모두 사용 가능한 반응형 웹을 제공한다.",
    ]),

    ("h1", "2. 상세 기능 명세"),
    ("h2", "2.1 MVP 핵심 기능"),
    ("p", "NutriVibe AI의 MVP는 '실행 가능한 최소 제품'을 목표로 다음 5가지 핵심 기능으로 구성한다."),
    ("table",
     ["기능", "기능 설명"],
     [
         ["사용자 식단 조건 설정", "보유 식재료, 식습관, 기피·알레르기, 식사 인원, 조리 시간을 입력하고 저장한다."],
         ["AI 맞춤 레시피 생성", "Gemini API를 활용하여 사용자 조건에 맞는 레시피 2~3개를 생성한다."],
         ["레시피 상세 정보 확인", "재료, 조리법, 기본 영양 참고 정보를 상세 화면에서 확인한다."],
         ["자동 쇼핑리스트 생성", "보유 식재료와 레시피 재료를 비교하여 누락된 식재료를 정리하고, 구매 항목을 체크·저장한다."],
         ["레시피 즐겨찾기 및 생성 기록", "즐겨찾기와 생성 기록을 localStorage에 저장하고 언제든 다시 조회한다."],
     ],
     [3.4, 14.0]),
    ("p", "MVP는 개발 범위와 비용을 통제하기 위해 다음 기능을 포함하지 않는다. 식재료 사진 인식, 의료 수준의 영양 진단, 복잡한 체중 감량 처방 기능, Redis, MinIO, 다중 LLM 동시 연동, 복잡한 회원 시스템, 외부 결제, IoT 기기 연동은 MVP 범위에서 제외한다."),

    ("h2", "2.2 기능별 Input-Process-Output"),
    ("p", "각 핵심 기능의 입력, 처리 과정, 출력은 다음 표와 같이 정의한다."),
    ("table",
     ["기능", "Input", "Process", "Output"],
     [
         ["사용자 식단 조건 설정", "보유 식재료, 식습관, 기피·알레르기, 식사 인원, 조리 시간", "입력값 검증 및 조건 저장", "조건 데이터(요청 및 화면 표시에 활용)"],
         ["AI 맞춤 레시피 생성", "사용자 조건, 고정 프롬프트", "Gemini API 호출 → JSON 검증 → 제한 조건 필터링", "레시피 2~3개(JSON 파싱 후 화면 표시)"],
         ["레시피 상세 정보 확인", "선택한 레시피 데이터", "상세 정보 조회·표시 및 기본 영양 참고 정보 계산", "레시피 상세 화면"],
         ["자동 쇼핑리스트 생성", "레시피 재료, 보유 식재료 목록", "누락 식재료 계산 및 정리", "쇼핑리스트(체크·저장 가능)"],
         ["즐겨찾기 및 생성 기록", "즐겨찾기·생성 기록 요청", "localStorage 읽기·쓰기", "즐겨찾기 목록 및 생성 기록 화면"],
     ],
     [2.6, 4.6, 5.4, 4.8]),
    ("p", "AI 레시피 생성 기능은 다음 절차로 동작하도록 계획한다."),
    ("nums", [
        "사용자 입력 조건(보유 식재료, 식습관, 기피·알레르기, 식사 인원, 조리 시간)을 수집한다.",
        "서버에서 고정 프롬프트와 사용자 조건을 결합하여 요청 메시지를 구성한다.",
        "Gemini API를 호출한다.",
        "AI가 JSON 형식의 레시피 결과를 반환한다.",
        "서버에서 JSON 형식과 필수 필드를 검증한다.",
        "알레르기 및 기피 식재료를 규칙 기반으로 필터링한다.",
        "검증에 실패한 결과는 제외하고, 필요한 경우 재요청한다.",
        "검증을 통과한 결과만 웹 화면에 표시한다.",
    ]),
    ("p", "영양 정보 안내: MVP는 외부 영양 데이터베이스를 연동하지 않는다. 프로젝트 내부의 nutrition-data.json에 저장된 기본 식재료 영양 참고 데이터를 사용하며, 시스템은 식재료명과 사용량을 기준으로 기초 계산을 수행한다. AI가 생성한 영양 정보는 최종 계산 근거로 사용하지 않고, 모든 영양 정보는 참고용으로 제공된다."),
    ("p", "알레르기 안전 안내: 시스템은 사용자가 입력한 알레르기·기피 정보를 바탕으로 규칙 기반 필터링과 위험 안내를 수행한다. 다만 이 기능이 절대적인 무알레르기를 보장하지는 않는다. 사용자는 식품 포장의 원재료명, 함유 성분 및 교차 오염 위험을 직접 확인해야 하며, 본 시스템은 의사 또는 영양사의 진단과 상담을 대체하지 않는다."),

    ("h2", "2.3 사용자 상호작용 흐름"),
    ("p", "사용자는 다음 절차에 따라 서비스를 이용한다. 사용자 동작(파란색)과 시스템 처리(주황색)를 구분하여 나타내면 그림 1과 같다."),
    ("fig", FIG1, "그림 1. NutriVibe AI 사용자 상호작용 흐름도", 5.6),

    ("h2", "2.4 시스템 아키텍처 및 데이터 흐름"),
    ("p", "NutriVibe AI는 Next.js 기반의 단일 웹 애플리케이션으로 구성한다. 사용자 브라우저는 Next.js Frontend에 접속하며, 모든 AI 호출은 서버 측 Next.js API Route를 통해서만 수행한다. API Route는 입력 검증, Gemini API 호출, JSON 파싱, 쇼핑리스트 계산을 담당하고 nutrition-data.json과 localStorage에 접근한다. 시스템 구성 및 데이터 흐름은 그림 2와 같다."),
    ("p", "주요 기술 스택은 다음과 같이 구성할 계획이다. Frontend는 Next.js, React, TypeScript, Tailwind CSS를 사용하고, Backend는 Next.js API Route를 사용한다. LLM은 Gemini API를 활용하며, 사용자 데이터는 브라우저 localStorage에 저장한다. 기본 영양 참고 데이터는 프로젝트 내부의 nutrition-data.json을 사용하고, 배포는 Vercel을 통해 진행한다. 코드 품질 관리는 ESLint와 TypeScript 검사를 활용하며, 개발 과정에서는 ChatGPT, Cursor IDE, v0.dev를 보조 도구로 활용한다."),
    ("fig", FIG2, "그림 2. NutriVibe AI 시스템 구성 및 데이터 흐름도", 12.6),

    ("h1", "3. Agentic & Vibe Coding 도구 활용 전략"),
    ("p", "본 프로젝트는 개발 생산성을 높이기 위해 Agentic & Vibe Coding 도구를 단계별로 활용할 계획이다. 각 도구의 역할과 구분은 다음 표와 같다."),
    ("table",
     ["도구", "주요 역할", "구분"],
     [
         ["ChatGPT", "요구사항 분석, MVP 범위 확정, 사용자 흐름 및 데이터 구조 설계", "개발 보조 도구"],
         ["v0.dev", "입력 폼, 레시피 카드, 레시피 상세 페이지, 쇼핑리스트 페이지의 UI 프로토타입 생성", "개발 보조 도구"],
         ["Cursor IDE", "Next.js, React, TypeScript 기반 페이지 및 컴포넌트 개발", "개발 보조 도구"],
         ["Cursor Agent", "API Route, 폼 검증, Gemini API 호출, JSON 파싱, 쇼핑리스트 계산 로직 구현", "개발 보조 도구"],
         ["Gemini API", "런타임에서 사용자 조건 기반 구조화된 레시피 생성", "런타임 AI 서비스"],
         ["ESLint·TypeScript", "코드 규칙, 타입 오류 및 기본 품질 검사", "품질 관리 도구"],
         ["Vercel", "웹 애플리케이션 배포 및 환경 변수 관리", "배포 플랫폼"],
     ],
     [3.2, 10.2, 4.0]),
    ("p", "위 도구 중 ChatGPT, v0.dev, Cursor 계열은 개발 과정에서 활용되는 보조 도구이며, Gemini API는 시스템 실행 시 실제로 호출되는 유일한 AI 서비스이다. MVP는 비용과 복잡도를 고려하여 단일 LLM API(Gemini API)만 연동할 계획이고, 여러 LLM의 동시 연동은 추후 확장 항목으로 남겨둔다."),

    ("h1", "4. 프롬프트 엔지니어링 및 컨텍스트 관리 전략"),
    ("h2", "4.1 프로젝트 전역 규칙"),
    ("p", "AI 코딩 도구가 일관된 기준을 따르도록 프로젝트 루트에 .cursorrules 파일을 두고 다음 전역 규칙을 적용한다."),
    ("box", "「.cursorrules」 전역 규칙", [
        "TypeScript를 사용한다.",
        "any 타입을 남용하지 않는다.",
        "API 키는 서버 환경 변수에만 저장한다.",
        "프론트엔드에 API 키를 노출하지 않는다.",
        "사용자 입력은 반드시 검증한다.",
        "AI가 반환한 JSON은 반드시 검증한다.",
        "한 번에 하나의 기능만 구현한다.",
        "관련 없는 파일을 수정하지 않는다.",
        "수정 전에 계획을 설명한다.",
        "수정 후 테스트 방법을 설명한다.",
        "의료 진단을 제공하지 않는다.",
        "알레르기 정보에는 위험 안내 문구를 표시한다.",
        ".env 파일을 업로드하지 않는다.",
    ]),

    ("h2", "4.2 AI 레시피 생성 프롬프트"),
    ("p", "레시피 생성은 서버에서 다음 기본 프롬프트를 유지하고, 사용자 입력값을 결합하여 Gemini API에 전달한다. 프롬프트와 JSON 스키마는 한 번 정의한 후 자주 변경하지 않고, 사용자 조건만 갱신하여 일관성을 유지한다."),
    ("box", "AI 레시피 생성 프롬프트(기본형)", [
        "당신은 가정식 레시피 전문가입니다. 아래 조건을 바탕으로 2~3개의 레시피를 JSON 형식으로 생성하세요.",
        "- 보유 식재료: {보유 식재료 목록}",
        "- 식사 인원: {인원 수}",
        "- 조리 시간: {분}",
        "- 식습관 및 선호: {선호 사항}",
        "- 기피 및 알레르기: {기피·알레르기 목록}",
        "- 보유 식재료를 최우선으로 활용할 것",
        "- 제한 식재료는 어떤 경우에도 사용하지 말 것",
        "- 결과는 지정된 JSON 형식(레시피명, 재료, 조리 단계, 조리 시간, 인원, 영양 참고 정보)을 따를 것",
        "- 의료적 조언을 제공하지 말 것",
    ]),

    ("h2", "4.3 오류 처리 및 품질 검증"),
    ("p", "개발 과정과 테스트 과정에서 다음 품질 관리 항목을 적용한다."),
    ("bullets", [
        "Git을 사용하여 버전을 관리하고, git diff로 AI 도구가 변경한 내용을 검토한다.",
        "변경 사항은 로컬 실행과 브라우저 테스트로 확인한다.",
        "서버 로그를 확인하여 API 호출 오류를 추적한다.",
        "오류 발생 시 전체 오류 메시지를 AI 도구에 전달하여 원인을 분석한다.",
        "원인을 먼저 분석한 후 수정하고, 필요한 경우 이전 버전으로 롤백한다.",
        "테스트 항목: 빈 입력, AI API 타임아웃, JSON 형식 오류, 알레르기 식재료 필터링, 모바일 화면 표시, API 키 노출 여부, ESLint 및 TypeScript 검사, 타사 의존성 라이선스 확인.",
    ]),

    ("h1", "5. 개발 로드맵 및 일정 계획(WBS)"),
    ("p", "MVP 개발은 총 8주 일정으로 진행할 계획이다. 주차별 작업 내용과 산출물은 다음 표와 같다."),
    ("p", "현재 진행 현황(2026년 10월 기준): 본 보고서는 1차 제출 이후 실제 개발을 진행한 결과를 반영하여 보완한 재제출본이다. MVP 핵심 기능 5가지(사용자 식단 조건 설정, AI 맞춤 레시피 생성, 레시피 상세 확인, 자동 쇼핑리스트 생성, 즐겨찾기·생성 기록)를 Next.js 기반으로 구현하여 로컬 환경에서 빌드와 동작을 확인하였다. Gemini API 연동은 서버 측 Next.js API Route에 구현되어 있어 서버 환경 변수에 API 키를 설정하면 실제 AI 레시피를 생성하고, 키가 없는 경우에는 데모 모드로 동작한다. 데모 모드의 내장 레시피는 불고기, 제육볶음, 갈비탕, 삼계탕, 부대찌개, 비빔밥, 잡채, 순두부찌개, 해물파전 등 실제 가정식 레시피 70여 종으로 구성되며, 온라인 레시피 사이트를 참고하여 재료와 조리법을 정리하였다. 사용자가 입력한 보유 식재료가 재료표에 포함된 레시피만을 골라 추천한다. 한국어뿐 아니라 중국어 등으로 입력한 재료명도 내부 매핑을 통해 자동 변환하여 매칭하며, 입력한 모든 식재료가 최소 하나의 레시피에 반영되도록 선택한다. 일치하는 레시피가 없는 경우에는 해당 식재료에 대한 안내 문구와 외부 레시피 검색 링크(네이버·구글)를 제공한다. Vercel 배포와 최종 발표 준비는 예정 단계이다."),
    ("p", "추가로 레시피 편의 기능과 기능 간 연동을 확장하였다. 레시피 상세 화면에서는 재료별 사용량과 평균 열량(내부 영양 참고 데이터 기준)을 곱하여 개별 열량을 산출하는 열량 상세 계산을 제공하고, 1인분 기준 영양과 일일 권장 열량 대비 비율을 함께 표시한다. 사용자의 키·몸무게·체지방률·나이·성별·활동 수준을 저장하는 개인 신체 프로필 기능을 추가하여 BMI 계산과 기초대사량(BMR), 일일 권장 열량을 추정한다. 추정된 목표 열량은 레시피 생성 요청에 함께 전달되어, 생성 결과의 각 레시피에 목표 열량 대비 비율과 안내가 표시된다."),
    ("p", "그 밖의 연동 기능으로는 레시피별 보유 식재료 활용률 표시, 결과 화면의 식단 열량 요약 비교, 즐겨찾기 레시피 재료의 쇼핑리스트 통합, 생성 기록의 조건 저장 및 다시 생성, 쇼핑리스트의 식품군(육류·해산물·채소·조미료 등) 자동 분류와 텍스트 복사 기능이 있다. UX 측면에서는 페이지 전환, 카드 등장, AI 생성 진행 단계 표시, 숫자 카운트업 등 애니메이션을 적용하여 사용자 피드백을 강화하였다. 모든 편의 기능은 MVP 범위 내에서 구현한 것으로, 의료적 진단이나 처방을 제공하지 않으며 영양 수치는 참고용이다."),
    ("p", "또한 지속적인 사용을 유도하기 위한 게임화(재미 요소) 기능을 MVP 범위 안에서 추가하였다. 첫째, 주요 동작(레시피 생성, 즐겨찾기, 쇼핑리스트 체크, 프로필 저장, 룰렛 사용, 일일 방문)마다 포인트를 부여하고, 일정 포인트를 쌓으면 레벨(1~10)과 칭호(냉장고 견습생, 집밥 요리사, 미식가, 레전드 셰프 등)가 올라가는 경험치·레벨 시스템을 구현하였다. 둘째, 12가지 업적(첫 요리, 레시피 수집가, 냉장고 정리왕, 식재료 박물관, 꾸준함의 힘 등)을 정의하고 달성 조건을 충족하면 배지와 보너스 포인트를 지급하며, 달성 시 화면 오른쪽 아래에 알림 애니메이션이 표시된다. 셋째, 매일 3개의 오늘의 미션이 새로 제시되고 완료 시 보상 포인트를 지급한다. 넷째, 메뉴 고민을 줄이기 위한 ‘오늘 뭐 먹지?’ 레시피 룰렛을 제공하고, 다섯째로 사용자가 입력한 식재료가 자동으로 기록되는 식재료 도감을 제공하여 수집의 재미를 더한다. 게임 데이터는 별도 서버 없이 브라우저 localStorage에 저장되어 개인 단위로 관리된다."),
    ("p", "구현된 MVP는 프로젝트 루트에서 npm install 후 npm run dev로 실행하며, 브라우저에서 http://localhost:3000에 접속한다. 프로덕션 빌드는 npm run build 후 npm start로 실행하고, Gemini API 키는 서버 환경 변수(GEMINI_API_KEY)로만 관리한다."),
    ("table",
     ["주차", "주요 작업 내용", "산출물", "진행 상태"],
     [
         ["1주차", "요구사항 정리, MVP 범위 확정, 사용자 흐름 및 JSON 구조 설계", "요구사항 정의서, 사용자 흐름도, JSON Schema", "완료"],
         ["2주차", "UI 프로토타입 및 페이지 구조 설계", "홈, 입력 폼, 레시피 페이지, 쇼핑리스트 페이지 프로토타입", "완료"],
         ["3~4주차", "사용자 입력 기능, Next.js API Route, Gemini API 레시피 생성 기능 개발", "실행 가능한 기본 MVP", "완료"],
         ["5주차", "레시피 상세, 즐겨찾기, 생성 기록 기능 개발", "레시피 관리 모듈", "완료"],
         ["6주차", "쇼핑리스트 및 기본 영양 정보 표시 기능 개발", "쇼핑리스트·영양 정보 모듈", "완료"],
         ["7주차", "통합 테스트, 오류 수정, 알레르기 조건 검증, 모바일 반응형 적용", "테스트 보고서, 버그 수정 기록, 안정 버전", "진행 중"],
         ["8주차", "Vercel 배포, 시연 준비, 최종 보고서 정리", "배포 URL, 시연 스크립트, 최종 프로젝트 자료", "예정"],
     ],
     [1.6, 8.6, 5.2, 2.0]),

    ("h1", "6. 프로젝트 요약 및 확장 계획"),
    ("h2", "6.1 프로젝트 핵심 가치"),
    ("bullets", [
        "개인 맞춤형 식단 제안: 사용자의 보유 식재료와 식습관을 반영한 레시피를 제공한다.",
        "식재료 낭비 감소: 보유 식재료 우선 활용과 쇼핑리스트 자동 생성으로 불필요한 구매를 줄인다.",
        "신속한 개발: Agentic & Vibe Coding 도구를 활용하여 단기간에 실행 가능한 MVP를 구축한다.",
        "안전한 데이터 처리: 알레르기 정보의 규칙 기반 필터링과 위험 안내를 제공한다.",
    ]),
    ("h2", "6.2 추후 확장 방향"),
    ("bullets", [
        "식재료 사진 인식",
        "사용자 계정 및 클라우드 저장",
        "1주일 단위 식단 계획",
        "더 풍부한 영양 데이터베이스 연동",
        "음성 입력 지원",
        "다국어 지원",
    ]),
    ("p", "위 기능은 MVP 범위에 포함되지 않으며, MVP 안정화 이후 사용자 피드백과 우선순위를 고려하여 단계적으로 검토할 계획이다."),
    ("h2", "6.3 면책 조항"),
    ("bullets", [
        "본 시스템은 식단 기획의 편의를 돕기 위한 보조 도구이다.",
        "제공되는 영양 정보와 알레르기 관련 안내는 참고용이며, 의료적 진단, 처방 또는 치료를 대신하지 않는다.",
        "알레르기, 질환 및 건강 상태에 관한 판단은 의사 또는 영양사와 상담해야 한다.",
        "사용자는 식품 포장의 원재료명과 교차 오염 정보를 직접 확인할 책임이 있다.",
        "AI가 생성한 레시피는 모델에 따라 달라질 수 있으며, 계획된 기능은 개발 과정에서 변경될 수 있다.",
    ]),
]

# ============================================================ PDF BUILDER
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Image, Table, TableStyle, KeepTogether)

pdfmetrics.registerFont(TTFont("Malgun", FONT_REG))
pdfmetrics.registerFont(TTFont("Malgun-Bold", FONT_BOLD))
registerFontFamily("Malgun", normal="Malgun", bold="Malgun-Bold",
                   italic="Malgun", boldItalic="Malgun-Bold")

USABLE_W = 21.0 - 3.6  # cm
HDR_BG = colors.HexColor("#DCE9F7")
BOX_BG = colors.HexColor("#F2F4F7")
GRID_C = colors.HexColor("#9AA5B1")


def _s(name, **kw):
    base = dict(fontName="Malgun", fontSize=10.0, leading=13.8, spaceAfter=3.0,
                wordWrap="CJK", alignment=4)  # 4 = justify
    base.update(kw)
    return ParagraphStyle(name, **base)


ST_H1 = _s("H1", fontName="Malgun-Bold", fontSize=13.5, leading=16.6, spaceBefore=10,
           spaceAfter=4.5, alignment=0)
ST_H2 = _s("H2", fontName="Malgun-Bold", fontSize=11.2, leading=14.4, spaceBefore=6,
           spaceAfter=3.0, alignment=0)
ST_P = _s("P")
ST_BUL = _s("Bul", leftIndent=14, bulletIndent=4, spaceAfter=2.5)
ST_NUM = _s("Num", leftIndent=14, bulletIndent=4, spaceAfter=2.5)
ST_CELL = _s("Cell", fontSize=9.0, leading=11.6, spaceAfter=0, alignment=0)
ST_CELLH = _s("CellH", fontName="Malgun-Bold", fontSize=9.2, leading=12.0,
              spaceAfter=0, alignment=0)
ST_CAP = _s("Cap", fontSize=9.2, leading=12.0, alignment=1, spaceAfter=8,
            spaceBefore=4, textColor=colors.HexColor("#333333"))
ST_BOX = _s("Box", fontSize=9.0, leading=12.6, spaceAfter=0, alignment=0)
ST_BOXT = _s("BoxT", fontName="Malgun-Bold", fontSize=9.4, leading=12.6,
             spaceAfter=3.5, alignment=0)


def cover_page():
    st = []
    st.append(Spacer(1, 2.2 * cm))
    st.append(Paragraph(COVER_TITLE.replace("<br/>", "<br/>"),
                        ParagraphStyle("ct", fontName="Malgun-Bold", fontSize=17,
                                       leading=23, alignment=1, spaceAfter=14)))
    st.append(Paragraph(COVER_PROJ, ParagraphStyle("cp", fontName="Malgun-Bold",
                                                   fontSize=13.5, leading=18,
                                                   alignment=1, spaceAfter=6)))
    st.append(Paragraph(COVER_TYPE, ParagraphStyle("ct2", fontName="Malgun",
                                                   fontSize=10.5, leading=15,
                                                   alignment=1, textColor=colors.HexColor("#444444"))))
    st.append(Spacer(1, 2.6 * cm))
    line_tbl = Table([[""]], colWidths=[10 * cm], rowHeights=[0.5])
    line_tbl.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 1.0, colors.HexColor("#999999")),
    ]))
    st.append(line_tbl)
    st.append(Spacer(1, 0.8 * cm))
    for txt in ["성명: " + STUDENT_NAME, "학번: " + STUDENT_ID, COVER_DATE]:
        st.append(Paragraph(txt, ParagraphStyle("cv", fontName="Malgun", fontSize=11,
                                                leading=22, alignment=1)))
    return st


def page_bg(canvas, doc):
    page = canvas.getPageNumber()
    if page == 1:
        return
    canvas.saveState()
    canvas.setFont("Malgun", 8)
    canvas.setFillColor(colors.HexColor("#555555"))
    canvas.drawRightString(A4[0] - 1.8 * cm, A4[1] - 1.15 * cm, "NutriVibe AI")
    canvas.setStrokeColor(colors.HexColor("#BBBBBB"))
    canvas.setLineWidth(0.4)
    canvas.line(1.8 * cm, A4[1] - 1.35 * cm, A4[0] - 1.8 * cm, A4[1] - 1.35 * cm)
    canvas.drawCentredString(A4[0] / 2.0, 1.3 * cm, str(page))
    canvas.restoreState()


def build_pdf():
    doc = SimpleDocTemplate(PDF_PATH, pagesize=A4,
                            leftMargin=1.8 * cm, rightMargin=1.8 * cm,
                            topMargin=1.7 * cm, bottomMargin=1.6 * cm,
                            title="NutriVibe AI 프로젝트 개발 계획서",
                            author="NutriVibe AI")
    story = cover_page()
    story.append(PageBreak())

    def add_table(header, rows, widths):
        data = [[Paragraph(h, ST_CELLH) for h in header]]
        for row in rows:
            data.append([Paragraph(c, ST_CELL) for c in row])
        t = Table(data, colWidths=[w * cm for w in widths], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HDR_BG),
            ("GRID", (0, 0), (-1, -1), 0.5, GRID_C),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3.0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.0),
        ]))
        return t

    def add_box(title, lines):
        parts = [Paragraph(title, ST_BOXT)]
        for ln in lines:
            parts.append(Paragraph(("• " if not ln.startswith("-") else "") + ln, ST_BOX))
        t = Table([[parts]], colWidths=[USABLE_W * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BOX_BG),
            ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#C9CDD4")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        return t

    def add_fig(path, caption, width_cm):
        from PIL import Image as PILImage
        im = PILImage.open(path)
        w, h = im.size
        wcm = width_cm
        hcm = wcm * h / w
        img = Image(path, width=wcm * cm, height=hcm * cm)
        cap = Paragraph(caption, ST_CAP)
        return KeepTogether([img, cap])

    def emit(item):
        """Return flowables for one content item."""
        out = []
        kind = item[0]
        if kind == "pagebreak":
            out.append(PageBreak())
        elif kind == "h1":
            out.append(Paragraph(item[1], ST_H1))
        elif kind == "h2":
            out.append(Paragraph(item[1], ST_H2))
        elif kind == "p":
            out.append(Paragraph(item[1], ST_P))
        elif kind == "bullets":
            for b in item[1]:
                out.append(Paragraph(b, ST_BUL, bulletText="•"))
        elif kind == "nums":
            for i, b in enumerate(item[1], 1):
                out.append(Paragraph(b, ST_NUM, bulletText=f"{i}."))
        elif kind == "table":
            out.append(add_table(item[1], item[2], item[3]))
        elif kind == "box":
            out.append(add_box(item[1], item[2]))
        elif kind == "fig":
            out.append(add_fig(item[1], item[2], item[3]))
        return out

    # group items by heading: a block starts at each h2; a bare h1 (chapter
    # with no subsection) attaches to its own following content items.
    chunks, cur, pending_h1 = [], [], None
    for item in ITEMS:
        kind = item[0]
        if kind == "h1":
            if cur:
                chunks.append(cur)
                cur = []
            pending_h1 = item
        elif kind == "h2":
            if cur:
                chunks.append(cur)
                cur = []
            if pending_h1 is not None:
                cur.append(pending_h1)
                pending_h1 = None
            cur.append(item)
        else:
            if pending_h1 is not None:
                cur.append(pending_h1)
                pending_h1 = None
            cur.append(item)
    if cur:
        chunks.append(cur)

    for chunk in chunks:
        flow = []
        for item in chunk:
            flow.extend(emit(item))
        story.append(KeepTogether(flow))

    doc.build(story, onFirstPage=page_bg, onLaterPages=page_bg)
    print("PDF saved:", PDF_PATH)


# ============================================================ DOCX BUILDER
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

GRAY = RGBColor(0x55, 0x55, 0x55)
BLACK = RGBColor(0x00, 0x00, 0x00)


def set_run_font(run, size=10, bold=False, color=None, name="Malgun Gothic"):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    if color is not None:
        run.font.color.rgb = color
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:ascii"), name)
    rFonts.set(qn("w:hAnsi"), name)
    rFonts.set(qn("w:eastAsia"), name)


def shade_cell(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), hexcolor)
    tcPr.append(shd)


def add_field(par, instr):
    run = par.add_run()
    f1 = OxmlElement("w:fldChar"); f1.set(qn("w:fldCharType"), "begin")
    it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = instr
    f2 = OxmlElement("w:fldChar"); f2.set(qn("w:fldCharType"), "end")
    run._r.append(f1); run._r.append(it); run._r.append(f2)
    set_run_font(run, size=9)


def build_docx():
    doc = Document()
    # page setup
    sec = doc.sections[0]
    sec.page_width = Cm(21.0); sec.page_height = Cm(29.7)
    sec.left_margin = Cm(1.8); sec.right_margin = Cm(1.8)
    sec.top_margin = Cm(1.6); sec.bottom_margin = Cm(1.5)
    sec.different_first_page_header_footer = True

    # default style
    normal = doc.styles["Normal"]
    normal.font.name = "Malgun Gothic"
    normal.font.size = Pt(10)
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), "Malgun Gothic")
    normal.paragraph_format.space_after = Pt(0)
    normal.paragraph_format.line_spacing = 1.08

    # header (content pages)
    hp = sec.header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = hp.add_run("NutriVibe AI")
    set_run_font(r, size=8.5, color=GRAY)

    # footer (content pages)
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_field(fp, "PAGE")

    def para(text="", size=10, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT,
             before=0, after=2.0, color=None, left=None, hang=None, keep=False):
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(before); pf.space_after = Pt(after)
        if left is not None:
            pf.left_indent = Cm(left)
        if hang is not None:
            pf.first_line_indent = Cm(-hang)
        if keep:
            pf.keep_with_next = True
        p.alignment = align
        if text:
            run = p.add_run(text)
            set_run_font(run, size=size, bold=bold, color=color)
        return p

    def heading(text, level):
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.keep_with_next = True
        pf.space_before = Pt(10 if level == 1 else 6)
        pf.space_after = Pt(4 if level == 1 else 3)
        run = p.add_run(text)
        set_run_font(run, size=13.5 if level == 1 else 11.2, bold=True, color=BLACK)
        return p

    def set_cell_margins(table, top=8, bottom=8, left=70, right=70):
        """Tighten table cell margins (twips)."""
        tblPr = table._tbl.tblPr
        mar = OxmlElement("w:tblCellMar")
        for tag, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
            el = OxmlElement("w:" + tag)
            el.set(qn("w:w"), str(val))
            el.set(qn("w:type"), "dxa")
            mar.append(el)
        tblPr.append(mar)

    def add_table(header, rows, widths):
        t = doc.add_table(rows=1 + len(rows), cols=len(header))
        t.style = "Table Grid"
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        t.autofit = False
        set_cell_margins(t)
        tblPr = t._tbl.tblPr
        layout = OxmlElement("w:tblLayout"); layout.set(qn("w:type"), "fixed")
        tblPr.append(layout)
        for j, h in enumerate(header):
            cell = t.cell(0, j)
            cell.width = Cm(widths[j])
            shade_cell(cell, "DCE9F7")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(h)
            set_run_font(run, size=9.0, bold=True)
        for i, row in enumerate(rows, 1):
            for j, val in enumerate(row):
                cell = t.cell(i, j)
                cell.width = Cm(widths[j])
                p = cell.paragraphs[0]
                p.paragraph_format.space_after = Pt(0)
                run = p.add_run(val)
                set_run_font(run, size=8.8)
        return t

    def add_box(title, lines):
        t = doc.add_table(rows=1, cols=1)
        t.style = "Table Grid"
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        t.autofit = False
        set_cell_margins(t, top=60, bottom=60, left=90, right=90)
        cell = t.cell(0, 0)
        cell.width = Cm(USABLE_W)
        shade_cell(cell, "F2F4F7")
        p0 = cell.paragraphs[0]
        p0.paragraph_format.space_after = Pt(3)
        run = p0.add_run(title)
        set_run_font(run, size=9.6, bold=True)
        for ln in lines:
            p = cell.add_paragraph()
            p.paragraph_format.space_after = Pt(0)
            prefix = "" if ln.startswith("-") else "• "
            run = p.add_run(prefix + ln)
            set_run_font(run, size=9.0)
        return t

    def add_fig(path, caption, width_cm):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(4)
        run = p.add_run()
        run.add_picture(path, width=Cm(width_cm))
        c = doc.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c.paragraph_format.space_after = Pt(6)
        rc = c.add_run(caption)
        set_run_font(rc, size=9.2, color=GRAY)

    # ---- cover
    para("", after=30)
    p = para(COVER_TITLE.replace("<br/>", "\n"), size=17, bold=True,
             align=WD_ALIGN_PARAGRAPH.CENTER, after=14)
    para(COVER_PROJ, size=13.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, after=6)
    para(COVER_TYPE, size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER, after=40, color=GRAY)
    # line
    lp = para("", after=30)
    lpPr = lp._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single"); bottom.set(qn("w:sz"), "8")
    bottom.set(qn("w:space"), "1"); bottom.set(qn("w:color"), "999999")
    pBdr.append(bottom); lpPr.append(pBdr)
    for t in ["성명: " + STUDENT_NAME, "학번: " + STUDENT_ID, COVER_DATE]:
        para(t, size=11, align=WD_ALIGN_PARAGRAPH.CENTER, after=8)

    # page break to content
    doc.add_page_break()

    last_para = None  # keep previous paragraph attached to following table/box/figure

    for item in ITEMS:
        kind = item[0]
        if kind == "pagebreak":
            doc.add_page_break()
            last_para = None
        elif kind == "toc":
            heading("목차", 1)
            for t in item[1]:
                last_para = para(t, size=10, left=0.5, after=3)
        elif kind == "h1":
            last_para = heading(item[1], 1)
        elif kind == "h2":
            last_para = heading(item[1], 2)
        elif kind == "p":
            last_para = para(item[1], size=10, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
        elif kind == "bullets":
            n = len(item[1])
            for k, b in enumerate(item[1]):
                last_para = para("• " + b, size=10,
                                 align=WD_ALIGN_PARAGRAPH.JUSTIFY,
                                 left=0.5, hang=0.35, after=1.5,
                                 keep=(k < n - 1))
        elif kind == "nums":
            n = len(item[1])
            for k, b in enumerate(item[1], 1):
                last_para = para(f"{k}. " + b, size=10,
                                 align=WD_ALIGN_PARAGRAPH.JUSTIFY,
                                 left=0.5, hang=0.4, after=1.5,
                                 keep=(k < n))
        elif kind == "table":
            if last_para is not None:
                last_para.paragraph_format.keep_with_next = True
            add_table(item[1], item[2], item[3])
            para("", after=4)
            last_para = None
        elif kind == "box":
            if last_para is not None:
                last_para.paragraph_format.keep_with_next = True
            add_box(item[1], item[2])
            para("", after=4)
            last_para = None
        elif kind == "fig":
            if last_para is not None:
                last_para.paragraph_format.keep_with_next = True
            add_fig(item[1], item[2], item[3])
            last_para = None

    doc.save(DOCX_PATH)
    print("DOCX saved:", DOCX_PATH)


if __name__ == "__main__":
    build_pdf()
    build_docx()
