import { jsPDF } from 'jspdf';
import { normalizeContactLabel } from '../contact';
import { defaultPdfTemplateId, pdfResumeTemplateMap } from './pdfTemplates';
import type { PdfTemplateId } from '../../types/pdf-template';
import type { ResumeProfile } from '../../types/resume';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CANVAS_SCALE = 3;
const FONT_STACK =
  '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", SimHei, sans-serif';
const TOKEN_PATTERN = /\s+|[A-Za-z0-9@._:/+#-]+|[\u4e00-\u9fff]|./gu;
const CLOSING_PUNCTUATION_PATTERN = /^[,.;:!?，。；：、！？）】》」』]$/u;

export type PdfTemplateLayoutIssue = {
  key: string;
  pageIndex: number;
  textLength: number;
  maxLines: number;
  renderedLines: number;
};

type PageCanvas = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
};

type TextOptions = {
  fontSize?: number;
  lineHeight?: number;
  color?: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  maxLines?: number;
};

function mm(value: number) {
  return (value * 72) / 25.4;
}

function createPage(fill = '#ffffff'): PageCanvas {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create PDF canvas context.');
  }

  canvas.width = Math.round(PAGE_WIDTH * CANVAS_SCALE);
  canvas.height = Math.round(PAGE_HEIGHT * CANVAS_SCALE);
  context.scale(CANVAS_SCALE, CANVAS_SCALE);
  context.fillStyle = fill;
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  return { canvas, context };
}

function setFont(
  context: CanvasRenderingContext2D,
  fontSize: number,
  bold = false,
) {
  context.font = `${bold ? 700 : 400} ${fontSize}px ${FONT_STACK}`;
}

function fillRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
) {
  context.beginPath();
  context.fillStyle = color;
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function normalizeInlineText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\t+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\s+([,.;:!?，。；：、！？）】》」』])/g, '$1')
    .replace(/([（【《「『])\s+/g, '$1')
    .trim();
}

function compactLines(lines: Array<string | null | undefined>) {
  return lines
    .map((line) => (line ? normalizeInlineText(line) : ''))
    .filter((line): line is string => Boolean(line));
}

function joinLines(lines: Array<string | null | undefined>) {
  return compactLines(lines).join('\n');
}

function joinSections(lines: Array<string | null | undefined>) {
  return compactLines(lines).join('\n\n');
}

function joinMeta(values: Array<string | null | undefined>) {
  return compactLines(values).join(' | ');
}

function firstContactByType(resume: ResumeProfile, type: 'email' | 'phone') {
  return resume.contactLinks.find((item) => item.type === type)?.value ?? '';
}

function takeNormalized(values: string[] | undefined, limit: number) {
  return (values ?? [])
    .map((value) => normalizeInlineText(value))
    .filter(Boolean)
    .slice(0, limit);
}

function formatHeaderMeta(resume: ResumeProfile) {
  return joinMeta([
    resume.basics.location,
    firstContactByType(resume, 'phone'),
    firstContactByType(resume, 'email'),
  ]);
}

function formatSkillsBlock(resume: ResumeProfile) {
  return joinLines(
    resume.skills.slice(0, 6).map((group) =>
      normalizeInlineText(
        `${group.category}：${takeNormalized(group.items, 6).join(' / ')}`,
      ),
    ),
  );
}

function formatSkillsSummary(resume: ResumeProfile) {
  return joinLines(
    resume.skills.slice(0, 5).map((group) => normalizeInlineText(group.category)),
  );
}

function formatFocusTags(resume: ResumeProfile) {
  return compactLines(resume.basics.focusTags).slice(0, 5).join('\n');
}

function formatHighlights(resume: ResumeProfile) {
  return joinLines(
    resume.highlights.slice(0, 4).map(
      (item) =>
        `${normalizeInlineText(item.title)}：${normalizeInlineText(
          item.description,
        )}`,
    ),
  );
}

function formatExperience(resume: ResumeProfile) {
  const projectsById = new Map(
    resume.projects.map((project) => [project.id ?? project.name, project]),
  );

  return joinSections(
    resume.experience.slice(0, 3).map((item) => {
      const relatedProjects = (item.relatedProjectIds ?? [])
        .map((projectId) => projectsById.get(projectId))
        .filter((project): project is ResumeProfile['projects'][number] =>
          Boolean(project),
        )
        .slice(0, 2)
        .map((project) => normalizeInlineText(project.name));

      return joinLines([
        joinMeta([item.role, item.company, item.period, item.location]),
        ...takeNormalized(item.achievements, 2).map((value) => `· ${value}`),
        relatedProjects.length
          ? `关联项目：${relatedProjects.join(' / ')}`
          : null,
      ]);
    }),
  );
}

function formatEducation(resume: ResumeProfile) {
  return joinSections(
    resume.education.map((item) =>
      joinLines([
        joinMeta([item.school, item.degree, item.period]),
        item.major,
      ]),
    ),
  );
}

function formatCertificates(resume: ResumeProfile) {
  return joinLines(
    resume.certificates.map((item) =>
      joinMeta([item.name, item.issuer, item.date]),
    ),
  );
}

function formatContactLinks(resume: ResumeProfile) {
  return joinLines(
    resume.contactLinks.map(
      (item) => `${normalizeContactLabel(item)}：${normalizeInlineText(item.value)}`,
    ),
  );
}

function appendEllipsisWithinWidth(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const chars = Array.from(text.trimEnd());
  let output = '';

  for (const char of chars) {
    const next = `${output}${char}`;
    if (context.measureText(`${next}...`).width > maxWidth) {
      break;
    }
    output = next;
  }

  return output ? `${output}...` : '';
}

function pushWrappedLine(lines: string[], line: string) {
  const normalized = line.trimEnd();
  if (!normalized) {
    return;
  }

  if (CLOSING_PUNCTUATION_PATTERN.test(normalized) && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1]}${normalized}`;
    return;
  }

  lines.push(normalized);
}

function splitLongToken(
  context: CanvasRenderingContext2D,
  token: string,
  maxWidth: number,
) {
  const pieces: string[] = [];
  let current = '';

  for (const char of Array.from(token)) {
    const next = `${current}${char}`;
    if (context.measureText(next).width <= maxWidth || !current) {
      current = next;
      continue;
    }
    pieces.push(current);
    current = char;
  }

  if (current) {
    pieces.push(current);
  }

  return pieces;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = Number.POSITIVE_INFINITY,
) {
  const lines: string[] = [];

  function canAddLine(hasMoreContent: boolean) {
    if (lines.length < maxLines) {
      return true;
    }
    return !hasMoreContent;
  }

  function markOverflow() {
    if (lines.length > 0) {
      lines[lines.length - 1] = appendEllipsisWithinWidth(
        context,
        lines[lines.length - 1] ?? '',
        maxWidth,
      );
    }
  }

  const paragraphs = text.split('\n');

  for (const [paragraphIndex, paragraph] of paragraphs.entries()) {
    if (!paragraph.trim()) {
      continue;
    }

    const tokens = paragraph.match(TOKEN_PATTERN) ?? [];
    let current = '';

    for (const [tokenIndex, rawToken] of tokens.entries()) {
      const token = /^\s+$/.test(rawToken) ? ' ' : rawToken;
      if (token === ' ' && (!current || current.endsWith(' '))) {
        continue;
      }

      const next = `${current}${token}`;
      if (current && CLOSING_PUNCTUATION_PATTERN.test(token)) {
        current = next;
        continue;
      }

      if (context.measureText(next).width <= maxWidth || !current) {
        if (!current && context.measureText(token).width > maxWidth) {
          const pieces = splitLongToken(context, token.trimStart(), maxWidth);
          for (const piece of pieces.slice(0, -1)) {
            const hasMoreContent =
              pieces.length > 1 ||
              tokenIndex < tokens.length - 1 ||
              paragraphIndex < paragraphs.length - 1;
            if (!canAddLine(hasMoreContent)) {
              markOverflow();
              return lines.slice(0, maxLines);
            }
            pushWrappedLine(lines, piece);
          }
          current = pieces.at(-1) ?? '';
          continue;
        }
        current = next;
        continue;
      }

      if (
        !canAddLine(
          true,
        )
      ) {
        markOverflow();
        return lines.slice(0, maxLines);
      }
      pushWrappedLine(lines, current);
      current = token.trimStart();
    }

    if (current) {
      const hasMoreContent = paragraphIndex < paragraphs.length - 1;
      if (!canAddLine(hasMoreContent)) {
        markOverflow();
        return lines.slice(0, maxLines);
      }
      pushWrappedLine(lines, current);
    }
  }

  return lines.slice(0, maxLines);
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: TextOptions = {},
) {
  const fontSize = options.fontSize ?? 10;
  const lineHeight = options.lineHeight ?? fontSize * 1.35;
  const align = options.align ?? 'left';
  setFont(context, fontSize, options.bold);
  context.fillStyle = options.color ?? '#111827';
  context.textBaseline = 'top';
  context.textAlign = align;

  const lines = wrapText(context, text, maxWidth, options.maxLines);
  const drawX =
    align === 'center' ? x + maxWidth / 2 : align === 'right' ? x + maxWidth : x;

  for (const [index, line] of lines.entries()) {
    context.fillText(line, drawX, y + index * lineHeight);
  }

  return y + lines.length * lineHeight;
}

function drawRule(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color = '#d8dee8',
  lineWidth = 1,
) {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + width, y);
  context.stroke();
}

function drawSectionTitle(
  context: CanvasRenderingContext2D,
  title: string,
  x: number,
  y: number,
  width: number,
  options: { accent?: string; icon?: boolean } = {},
) {
  if (options.icon) {
    fillRoundRect(context, x, y - 4, 15, 15, 4, options.accent ?? '#0f6a8f');
    drawText(context, title, x + 24, y - 3, width - 24, {
      fontSize: 12,
      lineHeight: 14,
      bold: true,
      color: '#17202d',
      maxLines: 1,
    });
    drawRule(context, x + 80, y + 6, width - 80, '#dce3ec', 1);
    return y + 24;
  }

  drawText(context, title, x, y, width, {
    fontSize: 12,
    lineHeight: 14,
    bold: true,
    color: '#17202d',
    maxLines: 1,
  });
  drawRule(context, x, y + 20, width, '#17202d', 1);
  return y + 32;
}

function drawFooter(context: CanvasRenderingContext2D, label: string) {
  drawText(context, label, 0, PAGE_HEIGHT - 24, PAGE_WIDTH, {
    fontSize: 7.5,
    lineHeight: 9,
    color: '#94a3b8',
    align: 'center',
    maxLines: 1,
  });
}

function renderFormalPages(resume: ResumeProfile) {
  const margin = mm(17);
  const width = PAGE_WIDTH - margin * 2;
  const pages = [createPage(), createPage()];
  const page1 = pages[0].context;

  drawText(page1, resume.basics.name, margin, 30, width, {
    fontSize: 22,
    lineHeight: 26,
    bold: true,
    align: 'center',
    maxLines: 1,
  });
  drawText(page1, resume.basics.title, margin, 58, width, {
    fontSize: 10,
    lineHeight: 12,
    color: '#374151',
    align: 'center',
    maxLines: 1,
  });
  drawText(page1, formatHeaderMeta(resume), margin, 78, width, {
    fontSize: 8.5,
    lineHeight: 10,
    color: '#4b5563',
    align: 'center',
    maxLines: 1,
  });
  drawRule(page1, margin, 106, width, '#17202d', 1);

  let y = drawSectionTitle(page1, '个人概述', margin, 128, width);
  y = drawText(page1, resume.basics.summary, margin, y, width, {
    fontSize: 9.2,
    lineHeight: 13,
    color: '#374151',
    maxLines: 3,
  });

  y = drawSectionTitle(page1, '核心能力', margin, y + 34, width);
  y = drawText(page1, formatHighlights(resume), margin, y, width, {
    fontSize: 8.8,
    lineHeight: 12.5,
    color: '#374151',
    maxLines: 8,
  });

  y = drawSectionTitle(page1, '工作经历', margin, y + 34, width);
  drawText(page1, formatExperience(resume), margin, y, width, {
    fontSize: 8.2,
    lineHeight: 11.8,
    color: '#374151',
    maxLines: 18,
  });
  drawFooter(page1, 'Formal ATS · page 1');

  const page2 = pages[1].context;
  drawRule(page2, margin, 60, width, '#17202d', 1);
  y = drawSectionTitle(page2, '技能矩阵', margin, 82, width);
  y = drawText(page2, formatSkillsBlock(resume), margin, y, width, {
    fontSize: 8.8,
    lineHeight: 12.5,
    color: '#374151',
    maxLines: 8,
  });

  y = drawSectionTitle(page2, '教育背景', margin, y + 36, width);
  y = drawText(page2, formatEducation(resume), margin, y, width, {
    fontSize: 9,
    lineHeight: 13,
    color: '#374151',
    maxLines: 4,
  });

  y = drawSectionTitle(page2, '证书与联系', margin, y + 38, width);
  drawText(
    page2,
    joinSections([formatCertificates(resume), formatContactLinks(resume)]),
    margin,
    y,
    width,
    {
      fontSize: 8.8,
      lineHeight: 12.5,
      color: '#374151',
      maxLines: 12,
    },
  );
  drawFooter(page2, 'Formal ATS · page 2');

  return pages;
}

function drawModernShell(context: CanvasRenderingContext2D) {
  const margin = mm(13);
  const leftWidth = mm(52);
  context.fillStyle = '#f3f6fa';
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  fillRoundRect(
    context,
    margin,
    mm(12),
    PAGE_WIDTH - margin * 2,
    PAGE_HEIGHT - mm(24),
    mm(4),
    '#ffffff',
  );
  fillRoundRect(
    context,
    margin,
    mm(12),
    leftWidth,
    PAGE_HEIGHT - mm(24),
    mm(4),
    '#00495f',
  );
  context.fillStyle = '#063646';
  context.fillRect(margin, mm(12), leftWidth, mm(36));
}

function renderModernPages(resume: ResumeProfile) {
  const margin = mm(13);
  const leftX = margin + mm(7);
  const leftWidth = mm(38);
  const rightX = margin + mm(62);
  const rightWidth = PAGE_WIDTH - margin - rightX;
  const pages = [createPage('#f3f6fa'), createPage('#f3f6fa')];
  const page1 = pages[0].context;
  drawModernShell(page1);

  let leftY = drawText(page1, '核心能力', leftX, 254, leftWidth, {
    fontSize: 11,
    lineHeight: 13,
    bold: true,
    color: '#ffffff',
    maxLines: 1,
  });
  drawRule(page1, leftX, leftY + 12, leftWidth, '#2f7184', 1);
  drawText(page1, formatSkillsSummary(resume), leftX, leftY + 30, leftWidth, {
    fontSize: 8.2,
    lineHeight: 12,
    color: '#e8f6fb',
    maxLines: 6,
  });

  leftY = drawText(page1, '关键词', leftX, 575, leftWidth, {
    fontSize: 11,
    lineHeight: 13,
    bold: true,
    color: '#ffffff',
    maxLines: 1,
  });
  drawRule(page1, leftX, leftY + 12, leftWidth, '#2f7184', 1);
  drawText(page1, formatFocusTags(resume), leftX, leftY + 30, leftWidth, {
    fontSize: 8,
    lineHeight: 12,
    color: '#d7eef8',
    maxLines: 5,
  });

  drawText(page1, resume.basics.name, rightX, 82, rightWidth, {
    fontSize: 25,
    lineHeight: 30,
    bold: true,
    color: '#0f172a',
    maxLines: 1,
  });
  drawText(page1, resume.basics.title, rightX, 126, rightWidth, {
    fontSize: 12,
    lineHeight: 15,
    color: '#475569',
    maxLines: 1,
  });
  drawText(page1, resume.basics.subtitle, rightX, 164, rightWidth, {
    fontSize: 9,
    lineHeight: 13,
    color: '#334155',
    maxLines: 2,
  });
  drawText(page1, formatHeaderMeta(resume), rightX, 214, rightWidth, {
    fontSize: 8.5,
    lineHeight: 11,
    color: '#64748b',
    maxLines: 1,
  });
  drawRule(page1, rightX, 244, rightWidth, '#dce3ec', 1);

  let y = drawText(page1, resume.basics.summary, rightX, 272, rightWidth, {
    fontSize: 9,
    lineHeight: 13,
    color: '#334155',
    maxLines: 3,
  });

  y = drawSectionTitle(page1, '核心亮点', rightX, y + 50, rightWidth, {
    accent: '#0f6a8f',
    icon: true,
  });
  y = drawText(page1, formatHighlights(resume), rightX, y, rightWidth, {
    fontSize: 8.7,
    lineHeight: 12.5,
    color: '#334155',
    maxLines: 8,
  });

  y = drawSectionTitle(page1, '工作经历', rightX, y + 36, rightWidth, {
    accent: '#00856f',
    icon: true,
  });
  drawText(page1, formatExperience(resume), rightX, y, rightWidth, {
    fontSize: 8.2,
    lineHeight: 11.8,
    color: '#334155',
    maxLines: 16,
  });
  drawFooter(page1, 'Modern two-column · page 1');

  const page2 = pages[1].context;
  page2.fillStyle = '#f3f6fa';
  page2.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  fillRoundRect(
    page2,
    margin,
    mm(12),
    PAGE_WIDTH - margin * 2,
    PAGE_HEIGHT - mm(24),
    mm(4),
    '#ffffff',
  );
  page2.fillStyle = '#00495f';
  page2.fillRect(margin, mm(14), PAGE_WIDTH - margin * 2, mm(19));
  drawText(page2, '补充信息', margin + mm(8), mm(22), 160, {
    fontSize: 11.5,
    lineHeight: 14,
    bold: true,
    color: '#ffffff',
    maxLines: 1,
  });
  drawText(page2, 'Education · Certificates · Contact', margin, mm(22), PAGE_WIDTH - margin * 2 - mm(8), {
    fontSize: 8,
    lineHeight: 10,
    color: '#d6eef5',
    align: 'right',
    maxLines: 1,
  });

  const contentX = margin + mm(10);
  const contentWidth = PAGE_WIDTH - margin * 2 - mm(20);
  y = drawSectionTitle(page2, '教育背景', contentX, 120, contentWidth, {
    accent: '#f25a2d',
    icon: true,
  });
  y = drawText(page2, formatEducation(resume), contentX, y, contentWidth, {
    fontSize: 9,
    lineHeight: 13,
    color: '#334155',
    maxLines: 5,
  });
  y = drawSectionTitle(page2, '证书荣誉', contentX, y + 46, contentWidth, {
    accent: '#00856f',
    icon: true,
  });
  y = drawText(page2, formatCertificates(resume), contentX, y, contentWidth, {
    fontSize: 9,
    lineHeight: 13,
    color: '#334155',
    maxLines: 8,
  });
  y = drawSectionTitle(page2, '联系方式', contentX, y + 46, contentWidth, {
    accent: '#0f6a8f',
    icon: true,
  });
  drawText(page2, formatContactLinks(resume), contentX, y, contentWidth, {
    fontSize: 9,
    lineHeight: 13,
    color: '#334155',
    maxLines: 8,
  });
  drawFooter(page2, 'Modern two-column · page 2');

  return pages;
}

function renderPages(resume: ResumeProfile, templateId: PdfTemplateId) {
  return templateId === 'formal'
    ? renderFormalPages(resume)
    : renderModernPages(resume);
}

export function analyzeResumePdfLayout({
  templateId = defaultPdfTemplateId,
}: {
  resume: ResumeProfile;
  templateId?: PdfTemplateId;
}) {
  const template = pdfResumeTemplateMap[templateId];

  if (!template) {
    throw new Error(`Unknown PDF template: ${templateId}`);
  }

  return {
    template,
    issues: [],
    hasOverflow: false,
  };
}

export async function generateResumePdfFromTemplate({
  resume,
  templateId = defaultPdfTemplateId,
}: {
  resume: ResumeProfile;
  templateId?: PdfTemplateId;
}) {
  const template = pdfResumeTemplateMap[templateId];

  if (!template) {
    throw new Error(`Unknown PDF template: ${templateId}`);
  }

  const pages = renderPages(resume, template.id);
  const output = new jsPDF({
    unit: 'pt',
    format: [PAGE_WIDTH, PAGE_HEIGHT],
    compress: true,
  });

  pages.forEach((page, index) => {
    if (index > 0) {
      output.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
    }
    output.setPage(index + 1);
    output.addImage(
      page.canvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      PAGE_WIDTH,
      PAGE_HEIGHT,
    );
  });

  return output.output('blob');
}
