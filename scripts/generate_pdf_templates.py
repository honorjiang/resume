from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "pdf-templates"
PAGE_WIDTH, PAGE_HEIGHT = A4


def register_fonts() -> None:
    regular_path = Path(r"C:\Windows\Fonts\msyh.ttc")
    bold_path = Path(r"C:\Windows\Fonts\simhei.ttf")
    if not regular_path.exists() or not bold_path.exists():
        raise FileNotFoundError("Required Windows fonts were not found.")

    try:
        regular = TTFont("ResumeSans", str(regular_path), subfontIndex=0)
    except TypeError:
        regular = TTFont("ResumeSans", str(regular_path))

    bold = TTFont("ResumeSansBold", str(bold_path))
    pdfmetrics.registerFont(regular)
    pdfmetrics.registerFont(bold)
    registerFontFamily("ResumeSans", normal="ResumeSans", bold="ResumeSansBold")


def draw_label(
    c: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    *,
    size: float,
    color: str,
    bold: bool = True,
) -> None:
    c.setFillColor(colors.HexColor(color))
    c.setFont("ResumeSansBold" if bold else "ResumeSans", size)
    c.drawString(x, y, text)


def draw_rule(
    c: canvas.Canvas,
    x1: float,
    y: float,
    x2: float,
    *,
    color: str = "#d8dee8",
    width: float = 0.7,
) -> None:
    c.setStrokeColor(colors.HexColor(color))
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def modern_section(
    c: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    *,
    width: float,
    color: str,
) -> None:
    c.saveState()
    c.setFillColor(colors.HexColor(color))
    c.roundRect(x, y - 3.2 * mm, 7 * mm, 7 * mm, 1.5 * mm, fill=1, stroke=0)
    draw_label(c, x + 10 * mm, y - 0.2 * mm, text, size=11.8, color="#17202d")
    draw_rule(c, x + 37 * mm, y + 1 * mm, x + width, color="#dce3ec", width=0.65)
    c.restoreState()


def formal_section(c: canvas.Canvas, x: float, y: float, text: str, *, width: float) -> None:
    c.saveState()
    draw_label(c, x, y, text, size=12.1, color="#17202d")
    draw_rule(c, x, y - 4.0 * mm, x + width, color="#17202d", width=0.85)
    c.restoreState()


def sidebar_label(c: canvas.Canvas, x: float, y: float, text: str) -> None:
    draw_label(c, x, y, text, size=10.5, color="#ffffff")
    draw_rule(c, x, y - 5 * mm, x + 39 * mm, color="#2f7184", width=0.55)


def page_footer(c: canvas.Canvas, label: str, color: str = "#9aa7b8") -> None:
    c.saveState()
    c.setFont("ResumeSans", 7.5)
    c.setFillColor(colors.HexColor(color))
    c.drawCentredString(PAGE_WIDTH / 2, 8 * mm, label)
    c.restoreState()


def modern_template(path: Path) -> None:
    margin = 13 * mm
    left_w = 52 * mm
    right_x = margin + left_w + 10 * mm
    right_w = PAGE_WIDTH - margin - right_x
    left_x = margin + 7 * mm
    sidebar = "#00495f"
    sidebar_dark = "#063646"
    blue = "#0f6a8f"
    teal = "#00856f"
    orange = "#f25a2d"

    c = canvas.Canvas(str(path), pagesize=A4)

    c.setFillColor(colors.HexColor("#f3f6fa"))
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.roundRect(
        margin,
        12 * mm,
        PAGE_WIDTH - 2 * margin,
        PAGE_HEIGHT - 24 * mm,
        4 * mm,
        fill=1,
        stroke=0,
    )
    c.setFillColor(colors.HexColor(sidebar))
    c.roundRect(margin, 12 * mm, left_w, PAGE_HEIGHT - 24 * mm, 4 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor(sidebar_dark))
    c.rect(margin, PAGE_HEIGHT - 48 * mm, left_w, 36 * mm, fill=1, stroke=0)

    sidebar_label(c, left_x, PAGE_HEIGHT - 77 * mm, "核心能力")
    sidebar_label(c, left_x, PAGE_HEIGHT - 160 * mm, "关键词")

    draw_rule(c, right_x, PAGE_HEIGHT - 77 * mm, PAGE_WIDTH - margin, color="#dce3ec", width=0.7)
    modern_section(c, right_x, PAGE_HEIGHT - 108 * mm, "核心亮点", width=right_w, color=blue)
    modern_section(c, right_x, PAGE_HEIGHT - 169 * mm, "工作经历", width=right_w, color=teal)
    page_footer(c, "Modern two-column · page 1")
    c.showPage()

    c.setFillColor(colors.HexColor("#f3f6fa"))
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.roundRect(
        margin,
        12 * mm,
        PAGE_WIDTH - 2 * margin,
        PAGE_HEIGHT - 24 * mm,
        4 * mm,
        fill=1,
        stroke=0,
    )
    c.setFillColor(colors.HexColor(sidebar))
    c.rect(margin, PAGE_HEIGHT - 33 * mm, PAGE_WIDTH - 2 * margin, 19 * mm, fill=1, stroke=0)
    draw_label(c, margin + 8 * mm, PAGE_HEIGHT - 23 * mm, "补充信息", size=11.6, color="#ffffff")
    c.setFont("ResumeSans", 8)
    c.setFillColor(colors.HexColor("#d6eef5"))
    c.drawRightString(PAGE_WIDTH - margin - 8 * mm, PAGE_HEIGHT - 23 * mm, "Education · Certificates · Contact")

    content_x = margin + 10 * mm
    content_w = PAGE_WIDTH - 2 * margin - 20 * mm
    modern_section(c, content_x, PAGE_HEIGHT - 50 * mm, "教育背景", width=content_w, color=orange)
    modern_section(c, content_x, PAGE_HEIGHT - 104 * mm, "证书荣誉", width=content_w, color=teal)
    modern_section(c, content_x, PAGE_HEIGHT - 163 * mm, "联系方式", width=content_w, color=blue)
    page_footer(c, "Modern two-column · page 2")
    c.save()


def formal_template(path: Path) -> None:
    margin = 17 * mm
    content_w = PAGE_WIDTH - 2 * margin
    ink = "#17202d"

    c = canvas.Canvas(str(path), pagesize=A4)
    c.setFillColor(colors.white)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    draw_rule(c, margin, PAGE_HEIGHT - 49 * mm, PAGE_WIDTH - margin, color=ink, width=0.8)
    draw_rule(c, margin, 14 * mm, PAGE_WIDTH - margin, color="#d8dee8", width=0.5)

    formal_section(c, margin, PAGE_HEIGHT - 57 * mm, "个人概述", width=content_w)
    formal_section(c, margin, PAGE_HEIGHT - 96 * mm, "核心能力", width=content_w)
    formal_section(c, margin, PAGE_HEIGHT - 153 * mm, "工作经历", width=content_w)
    page_footer(c, "Formal ATS · page 1", "#64748b")
    c.showPage()

    c.setFillColor(colors.white)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    draw_rule(c, margin, PAGE_HEIGHT - 22 * mm, PAGE_WIDTH - margin, color=ink, width=0.8)
    draw_rule(c, margin, 14 * mm, PAGE_WIDTH - margin, color="#d8dee8", width=0.5)

    formal_section(c, margin, PAGE_HEIGHT - 39 * mm, "技能矩阵", width=content_w)
    formal_section(c, margin, PAGE_HEIGHT - 112 * mm, "教育背景", width=content_w)
    formal_section(c, margin, PAGE_HEIGHT - 165 * mm, "证书与联系", width=content_w)
    page_footer(c, "Formal ATS · page 2", "#64748b")
    c.save()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    register_fonts()
    modern_template(OUT_DIR / "modern-template-base.pdf")
    formal_template(OUT_DIR / "formal-template-base.pdf")
    print("Generated templates:")
    print(OUT_DIR / "modern-template-base.pdf")
    print(OUT_DIR / "formal-template-base.pdf")


if __name__ == "__main__":
    main()
