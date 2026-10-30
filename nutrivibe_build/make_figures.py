# -*- coding: utf-8 -*-
"""NutriVibe AI report figures: user flow diagram + system architecture diagram."""
import os
from matplotlib import font_manager
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

BASE = r"D:\cxdownload\LOT\NutriVibeAI\nutrivibe_build"
OUT1 = os.path.join(BASE, "fig1_flow.png")
OUT2 = os.path.join(BASE, "fig2_arch.png")

# Register Korean fonts
for f in [r"C:\Windows\Fonts\malgun.ttf", r"C:\Windows\Fonts\malgunbd.ttf"]:
    font_manager.fontManager.addfont(f)
plt.rcParams["font.family"] = "Malgun Gothic"
plt.rcParams["axes.unicode_minus"] = False

BLUE_BG = "#DCE9F7"; BLUE_ED = "#2F5597"
ORANGE_BG = "#FDEBD0"; ORANGE_ED = "#B45F06"
GREEN_BG = "#E2F2E7"; GREEN_ED = "#3E7D52"
PURPLE_BG = "#E9E6F5"; PURPLE_ED = "#6C5CA8"
GRAY_TXT = "#404040"


def draw_box(ax, cx, cy, w, h, text, fc, ec, fs=9.0, weight="bold", sub=None):
    box = FancyBboxPatch((cx - w / 2, cy - h / 2), w, h,
                         boxstyle="round,pad=0.25,rounding_size=0.7",
                         linewidth=1.3, edgecolor=ec, facecolor=fc, zorder=2)
    ax.add_patch(box)
    if sub:
        ax.text(cx, cy + h * 0.16, text, ha="center", va="center", fontsize=fs,
                fontweight=weight, color="#1a1a1a", zorder=3)
        ax.text(cx, cy - h * 0.22, sub, ha="center", va="center", fontsize=fs - 2.2,
                color=GRAY_TXT, zorder=3)
    else:
        ax.text(cx, cy, text, ha="center", va="center", fontsize=fs,
                fontweight=weight, color="#1a1a1a", zorder=3)


def arrow(ax, x1, y1, x2, y2, color="#555555", lw=1.6, style="-|>", ls="-"):
    a = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, mutation_scale=16,
                        linewidth=lw, color=color, linestyle=ls, zorder=1)
    ax.add_patch(a)


# ---------------------------------------------------------------- Figure 1
steps = [
    ("웹사이트 접속", True),
    ("보유 식재료 및 식습관 조건 입력", True),
    ("식사 인원과 조리 시간 설정", True),
    ("레시피 생성 요청", True),
    ("서버 입력 검증 후 AI API 호출", False),
    ("AI 레시피 2~3개 생성", False),
    ("JSON 및 제한 조건 검증", False),
    ("레시피 상세 정보 확인", True),
    ("즐겨찾기 저장", True),
    ("쇼핑리스트 자동 생성", True),
    ("구매 항목 체크 및 저장", True),
]

fig, ax = plt.subplots(figsize=(4.1, 9.4), dpi=230)
ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis("off")

BW = 86.0; BH = 6.4
top = 97.5; step = 8.25
cx = 50.0
n = len(steps)
for i, (text, is_user) in enumerate(steps):
    cy = top - i * step
    fc = BLUE_BG if is_user else ORANGE_BG
    ec = BLUE_ED if is_user else ORANGE_ED
    draw_box(ax, cx, cy, BW, BH, text, fc, ec, fs=8.6)
    if i < n - 1:
        arrow(ax, cx, cy - BH / 2 - 0.25, cx, cy - step + BH / 2 + 0.25)

draw_box(ax, 12.0, 2.2, 16.5, 3.4, "사용자 동작", BLUE_BG, BLUE_ED, fs=6.4, weight="bold")
draw_box(ax, 32.0, 2.2, 16.5, 3.4, "시스템 처리", ORANGE_BG, ORANGE_ED, fs=6.4, weight="bold")

plt.tight_layout(pad=0.3)
plt.savefig(OUT1, bbox_inches="tight", facecolor="white")
plt.close()
print("fig1 saved:", OUT1)

# ---------------------------------------------------------------- Figure 2
fig2, ax2 = plt.subplots(figsize=(9.2, 6.6), dpi=210)
ax2.set_xlim(0, 100); ax2.set_ylim(0, 100); ax2.axis("off")


def region(ax, x0, y0, x1, y1, label, fc="#F5F6F8", ec="#B7BCC4", label_bottom=False):
    r = FancyBboxPatch((x0, y0), x1 - x0, y1 - y0,
                       boxstyle="round,pad=0.5,rounding_size=1.2",
                       linewidth=1.0, edgecolor=ec, facecolor=fc, zorder=0,
                       linestyle=(0, (4, 3)))
    ax.add_patch(r)
    ly = y0 + 3.0 if label_bottom else y1 - 3.0
    ax.text(x0 + 1.8, ly, label, ha="left", va="center", fontsize=8.4,
            fontweight="bold", color="#6A6F78", zorder=1)


# Regions: browser (left) / server (right upper) / external AI (right lower)
region(ax2, 2, 6, 51, 98, "사용자 브라우저 (클라이언트)")
region(ax2, 55, 58, 98, 98, "Next.js 서버 영역", fc="#EFEFF6", ec="#9A9ABC")
region(ax2, 55, 6, 98, 50, "외부 AI 서비스", fc="#FBF4E4", ec="#C9B37E", label_bottom=True)

# Browser-side boxes
draw_box(ax2, 26.5, 88, 42, 9.5, "Next.js Frontend", BLUE_BG, BLUE_ED, fs=10,
         sub="React + TypeScript + Tailwind CSS")
draw_box(ax2, 26.5, 72, 42, 9.0, "화면 표시 · 입력 수집", BLUE_BG, BLUE_ED, fs=9.4,
         sub="영양 계산 · 쇼핑리스트 계산")
draw_box(ax2, 26.5, 55, 42, 9.5, "localStorage", GREEN_BG, GREEN_ED, fs=9.6,
         sub="조건 / 즐겨찾기 / 기록 / 장보기 / 프로필")
draw_box(ax2, 26.5, 38, 42, 9.0, "nutrition-data.json", PURPLE_BG, PURPLE_ED, fs=9.2,
         sub="내장 영양 참고 데이터 68종")

# Server box
draw_box(ax2, 76.5, 84, 38, 11.5, "Next.js API Route", "#E3E1F3", "#4B4B9B", fs=10,
         sub="입력 검증 → 프롬프트 구성\nAI 호출 → JSON 검증 → 필터링")

# External AI boxes
draw_box(ax2, 76.5, 39, 38, 9.5, "Groq API (기본)", ORANGE_BG, ORANGE_ED, fs=10,
         sub="구조화된 JSON 레시피 생성")
draw_box(ax2, 76.5, 22, 38, 9.5, "Gemini API (대체)", "#F7E7CE", "#A9752F", fs=10,
         sub="기본 제공방 실패 시 1회 시도")

# Arrows: browser <-> server
arrow(ax2, 47.8, 88, 57.2, 88, lw=1.8)
arrow(ax2, 57.2, 82.5, 47.8, 82.5, lw=1.6, ls=(0, (4, 3)))
ax2.text(52.5, 89.2, "요청", fontsize=6.8, color=GRAY_TXT, ha="center", va="bottom")
ax2.text(52.5, 81.3, "결과", fontsize=6.8, color=GRAY_TXT, ha="center", va="top")

# Arrows: server -> AI providers
arrow(ax2, 68, 78.2, 68, 44.3, lw=1.8)
arrow(ax2, 88, 44.3, 88, 78.2, lw=1.6, ls=(0, (4, 3)))
ax2.text(69.4, 70.0, "프롬프트 + 사용자 조건", fontsize=6.6, color=GRAY_TXT,
         ha="left", va="center")
ax2.text(86.6, 63.0, "JSON 레시피 응답", fontsize=6.6, color=GRAY_TXT,
         ha="right", va="center")
arrow(ax2, 76.5, 34.0, 76.5, 27.0, lw=1.4, ls=(0, (3, 3)))
ax2.text(78.0, 30.4, "실패 시 대체", fontsize=6.4, color=GRAY_TXT, ha="left", va="center")

# Arrows inside browser region
arrow(ax2, 26.5, 83.2, 26.5, 76.8, lw=1.5)
arrow(ax2, 26.5, 67.3, 26.5, 60.0, lw=1.5)
arrow(ax2, 26.5, 50.0, 26.5, 42.7, lw=1.5, ls=(0, (4, 3)))
ax2.text(28.2, 46.2, "참고값 조회", fontsize=6.4, color=GRAY_TXT, ha="left", va="center")
ax2.text(28.2, 63.6, "저장 / 조회", fontsize=6.4, color=GRAY_TXT, ha="left", va="center")

plt.tight_layout(pad=0.3)
plt.savefig(OUT2, bbox_inches="tight", facecolor="white")
plt.close()
print("fig2 saved:", OUT2)
