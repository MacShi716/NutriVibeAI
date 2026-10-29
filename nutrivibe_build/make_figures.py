# -*- coding: utf-8 -*-
"""NutriVibe AI report figures: user flow diagram + system architecture diagram."""
import os
from matplotlib import font_manager
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

BASE = os.path.dirname(os.path.abspath(__file__))
OUT1 = os.path.join(BASE, "fig1_flow.png")
OUT2 = os.path.join(BASE, "fig2_arch.png")

# Register Korean fonts
_FONT_DIR = os.environ.get("NV_FONT_DIR", os.path.join(os.environ.get("WINDIR", ""), "Fonts"))
for f in [os.path.join(_FONT_DIR, "malgun.ttf"), os.path.join(_FONT_DIR, "malgunbd.ttf")]:
    font_manager.fontManager.addfont(f)
plt.rcParams["font.family"] = "Malgun Gothic"
plt.rcParams["axes.unicode_minus"] = False

BLUE_BG = "#DCE9F7"; BLUE_ED = "#2F5597"
ORANGE_BG = "#FDEBD0"; ORANGE_ED = "#B45F06"
GRAY_TXT = "#404040"

# ---------------------------------------------------------------- Figure 1
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


steps = [
    ("웹사이트 접속", True),
    ("보유 식재료 및 식습관 조건 입력", True),
    ("식사 인원과 조리 시간 설정", True),
    ("레시피 생성 요청", True),
    ("Gemini API 호출", False),
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
# fit: 11 boxes, total height = (n-1)*step + BH ; top - bottom = 10*8.25+6.4 = 88.9 -> bottom at ~8.6 ok
for i, (text, is_user) in enumerate(steps):
    cy = top - i * step
    fc = BLUE_BG if is_user else ORANGE_BG
    ec = BLUE_ED if is_user else ORANGE_ED
    draw_box(ax, cx, cy, BW, BH, text, fc, ec, fs=8.6)
    if i < n - 1:
        arrow(ax, cx, cy - BH / 2 - 0.25, cx, cy - step + BH / 2 + 0.25)

# legend
lx = 4.5
draw_box(ax, 12.0, 2.2, 16.5, 3.4, "사용자 동작", BLUE_BG, BLUE_ED, fs=6.4, weight="bold")
draw_box(ax, 32.0, 2.2, 16.5, 3.4, "시스템 처리", ORANGE_BG, ORANGE_ED, fs=6.4, weight="bold")

plt.tight_layout(pad=0.3)
plt.savefig(OUT1, bbox_inches="tight", facecolor="white")
plt.close()
print("fig1 saved:", OUT1)

# ---------------------------------------------------------------- Figure 2
fig2, ax2 = plt.subplots(figsize=(9.0, 6.4), dpi=200)
ax2.set_xlim(0, 100); ax2.set_ylim(0, 100); ax2.axis("off")

def region(ax, x0, y0, x1, y1, label, fc="#F5F6F8", ec="#B7BCC4"):
    r = FancyBboxPatch((x0, y0), x1 - x0, y1 - y0,
                       boxstyle="round,pad=0.5,rounding_size=1.2",
                       linewidth=1.0, edgecolor=ec, facecolor=fc, zorder=0,
                       linestyle=(0, (4, 3)))
    ax.add_patch(r)
    ax.text(x0 + 1.6, y1 - 3.2, label, ha="left", va="center", fontsize=8.6,
            fontweight="bold", color="#6A6F78", zorder=1)

# Regions
region(ax2, 3, 74, 97, 98, "사용자 브라우저 (클라이언트)")
region(ax2, 3, 44, 55, 68, "프론트엔드 영역")
region(ax2, 3, 6, 97, 40, "백엔드 영역 (Next.js 서버)")
region(ax2, 60, 44, 97, 68, "외부 AI 서비스", fc="#FBF4E4", ec="#C9B37E")

# Boxes
draw_box(ax2, 50, 92, 40, 9, "사용자 브라우저", BLUE_BG, BLUE_ED, fs=10, sub="PC / 모바일 웹")
draw_box(ax2, 50, 71, 58, 11, "Next.js Frontend", BLUE_BG, BLUE_ED, fs=10.5, sub="React + TypeScript + Tailwind CSS")
draw_box(ax2, 50, 49, 60, 11, "Next.js API Route", BLUE_BG, BLUE_ED, fs=10.5, sub="입력 검증 / AI 호출 / 데이터 처리")
draw_box(ax2, 80, 55, 30, 11, "Gemini API", ORANGE_BG, ORANGE_ED, fs=10.5, sub="구조화된 JSON 레시피 생성")
draw_box(ax2, 26, 24, 40, 10.5, "nutrition-data.json", "#E9E6F5", "#6C5CA8", fs=9.6, sub="기본 영양 참고 데이터")
draw_box(ax2, 72, 24, 44, 10.5, "localStorage", "#E2F2E7", "#3E7D52", fs=9.6, sub="즐겨찾기 / 생성 기록 / 쇼핑리스트 저장")

# Main arrows
arrow(ax2, 50, 87.3, 50, 76.8, lw=1.8)
arrow(ax2, 50, 65.3, 50, 54.8, lw=1.8)
arrow(ax2, 80, 48.9, 80, 60.5, lw=1.8, ls="-")
# Gemini return
arrow(ax2, 77.2, 58.0, 64.0, 51.5, lw=1.5, ls=(0, (4, 3)))
# data arrows
arrow(ax2, 38, 43.2, 26, 30.0, lw=1.5, ls=(0, (4, 3)))
arrow(ax2, 62, 43.2, 72, 30.0, lw=1.5, ls=(0, (4, 3)))

# arrow labels
ax2.text(51.2, 80.0, "요청 / 응답", fontsize=7.2, color=GRAY_TXT, rotation=90, ha="left", va="center")
ax2.text(81.2, 55.0, "프롬프트 + 사용자 조건", fontsize=7.2, color=GRAY_TXT, ha="left", va="center")
ax2.text(62.5, 54.0, "JSON 레시피 반환", fontsize=7.2, color=GRAY_TXT, ha="right", va="center")
ax2.text(27.5, 35.5, "영양 참고 데이터 조회", fontsize=7.0, color=GRAY_TXT, ha="left", va="center", rotation=58)
ax2.text(70.0, 35.5, "저장 / 조회", fontsize=7.0, color=GRAY_TXT, ha="right", va="center", rotation=-58)

plt.tight_layout(pad=0.3)
plt.savefig(OUT2, bbox_inches="tight", facecolor="white")
plt.close()
print("fig2 saved:", OUT2)
