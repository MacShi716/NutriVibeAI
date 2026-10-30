# -*- coding: utf-8 -*-
"""수정 제출본 검증: 쪽수, 필수 문구, 제목 고아(orphan) 여부를 확인한다.

usage: python verify_report.py [report.pdf] [docx_preview.pdf]
"""
from pypdf import PdfReader
import os, re, sys

_here = os.path.dirname(os.path.abspath(__file__))
_pdf = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.environ.get("NV_OUT_DIR", os.path.dirname(_here)),
    os.environ.get("NV_REPORT_NAME", "NutriVibeAI_report") + ".pdf")
_prev = sys.argv[2] if len(sys.argv) > 2 else os.path.join(_here, "docx_preview.pdf")

pdf = PdfReader(_pdf)
docx = PdfReader(_prev)
print("pdf pages:", len(pdf.pages), "| docx pages:", len(docx.pages))

t = "".join((pg.extract_text() or "") for pg in pdf.pages).replace(" ", "").replace("\n", "")
keywords = [
    "수정제출본",
    "1차제출이후",
    "계층별책임",
    "세영역",
    "localStorage",
    "GROQ_API_KEY",
    "계산불가",
    "npmrunbuild",
    "npmrundev",
    "예정",
]
for kw in keywords:
    print(kw, "->", kw in t)

for name, rdr in [("pdf", pdf), ("docx", docx)]:
    for i, pg in enumerate(rdr.pages, 1):
        lines = [l.strip() for l in (pg.extract_text() or "").splitlines() if l.strip()]
        if not lines:
            continue
        last = lines[-1]
        if re.match(r"^\d+\.\d+\s", last) or re.match(r"^\d+\.\s", last):
            print("ORPHAN", name, "page", i, ":", last[:60])
print("done")
