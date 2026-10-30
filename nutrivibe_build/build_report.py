# -*- coding: utf-8 -*-
"""Build NutriVibe AI project plan report: PDF (reportlab) + DOCX (python-docx)."""
import os
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.environ.get("NV_OUT_DIR", os.path.dirname(BASE))
# 개인 정보(성명/학번)와 파일 이름은 코드에 하드코딩하지 않고 환경 변수로 전달한다.
STUDENT_NAME = os.environ.get("NV_STUDENT_NAME", "")
STUDENT_ID = os.environ.get("NV_STUDENT_ID", "")
REPORT_NAME = os.environ.get("NV_REPORT_NAME", "NutriVibeAI_report")
PDF_PATH = os.path.join(OUT_DIR, REPORT_NAME + ".pdf")
DOCX_PATH = os.path.join(OUT_DIR, REPORT_NAME + ".docx")
FIG1 = os.path.join(BASE, "fig1_flow.png")
FIG2 = os.path.join(BASE, "fig2_arch.png")

FONT_REG = r"C:\Windows\Fonts\malgun.ttf"
FONT_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"

# ============================================================ CONTENT
COVER_TITLE = "생성형 AI 기반 Agentic Coding(Vibe Coding)<br/>프로젝트 기획 및 개발 계획서"
COVER_PROJ = "프로젝트명: NutriVibe AI"
COVER_TYPE = "생성형 AI 기반 개인 맞춤 식단 기획 및 쇼핑리스트 웹 애플리케이션"
COVER_DATE = "제출일: 2026년 11월 (수정 제출본)"

# 본문(TOC/ITEMS)은 content_v2.py 로 분리하였다.
import sys as _sys
_sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content_v2 import TOC, ITEMS  # noqa: E402

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
            raw = ln[1:] if ln.startswith("~") else ln
            prefix = "" if ln.startswith("-") or ln.startswith("~") else "• "
            parts.append(Paragraph(prefix + raw, ST_BOX))
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
        # 행이 페이지 경계에서 잘리지 않도록 cantSplit 을 설정한다
        for tr in t._tbl.tr_lst:
            trPr = tr.get_or_add_trPr()
            cant = OxmlElement("w:cantSplit")
            trPr.append(cant)
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
            raw = ln[1:] if ln.startswith("~") else ln
            prefix = "" if ln.startswith("-") or ln.startswith("~") else "• "
            run = p.add_run(prefix + raw)
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
