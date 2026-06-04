import templateFileNames from 'virtual:pdf-template-files';
import configuredTemplateDefinitions from './pdfTemplateConfigs.json';
import type {
  PdfResumeTemplate,
  PdfTextAlign,
  PdfTemplateTextBlock,
} from '../../types/pdf-template';

const PT_PER_MM = 72 / 25.4;

function mm(value: number) {
  return value * PT_PER_MM;
}

function slugifyTemplateId(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function humanizeTemplateName(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\btemplate\b/gi, '')
    .replace(/\bbase\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type RawTemplateTextBlock = {
  key: string;
  pageIndex: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSize: number;
  lineHeight: number;
  color?: string;
  align?: PdfTextAlign;
  bold?: boolean;
  wrapMode?: 'wrap' | 'clip-line';
};

type TemplateDefinition = {
  id: string;
  name: string;
  version?: string;
  description: string;
  blocks: RawTemplateTextBlock[];
};

const typedTemplateDefinitions = configuredTemplateDefinitions as Record<
  string,
  TemplateDefinition
>;

function normalizeBlock(block: RawTemplateTextBlock): PdfTemplateTextBlock {
  return {
    key: block.key,
    pageIndex: block.pageIndex,
    x: mm(block.xMm),
    y: mm(block.yMm),
    width: mm(block.widthMm),
    height: mm(block.heightMm),
    fontSize: block.fontSize,
    lineHeight: block.lineHeight,
    color: block.color,
    align: block.align,
    bold: block.bold,
    wrapMode: block.wrapMode,
  };
}

function buildFallbackBlocks(): PdfTemplateTextBlock[] {
  const fallbackBlocks: RawTemplateTextBlock[] = [
    { key: 'name', pageIndex: 0, xMm: 17, yMm: 15, widthMm: 176, heightMm: 10, fontSize: 21, lineHeight: 24, align: 'center', bold: true, color: '#111827' },
    { key: 'title', pageIndex: 0, xMm: 17, yMm: 28, widthMm: 176, heightMm: 7, fontSize: 9.4, lineHeight: 11, align: 'center', color: '#374151', wrapMode: 'clip-line' },
    { key: 'headerMeta', pageIndex: 0, xMm: 25, yMm: 37, widthMm: 160, heightMm: 8, fontSize: 8.2, lineHeight: 10, align: 'center', color: '#4b5563', wrapMode: 'clip-line' },
    { key: 'summary', pageIndex: 0, xMm: 17, yMm: 68, widthMm: 176, heightMm: 16, fontSize: 9.0, lineHeight: 12.3, color: '#374151' },
    { key: 'highlights', pageIndex: 0, xMm: 17, yMm: 108, widthMm: 176, heightMm: 36, fontSize: 8.7, lineHeight: 11.8, color: '#374151' },
    { key: 'experience', pageIndex: 0, xMm: 17, yMm: 165, widthMm: 176, heightMm: 80, fontSize: 8.3, lineHeight: 11.4, color: '#374151' },
    { key: 'skills', pageIndex: 1, xMm: 17, yMm: 48, widthMm: 176, heightMm: 51, fontSize: 8.9, lineHeight: 12.0, color: '#374151' },
    { key: 'education', pageIndex: 1, xMm: 17, yMm: 121, widthMm: 176, heightMm: 31, fontSize: 9.2, lineHeight: 12.4, color: '#374151' },
    { key: 'certificatesAndContact', pageIndex: 1, xMm: 17, yMm: 174, widthMm: 176, heightMm: 55, fontSize: 8.9, lineHeight: 12.0, color: '#374151' },
  ];

  return fallbackBlocks.map(normalizeBlock);
}

function buildAutoDiscoveredTemplate(fileName: string): PdfResumeTemplate {
  const configuredTemplate = typedTemplateDefinitions[fileName];

  if (configuredTemplate) {
    return {
      id: configuredTemplate.id,
      name: configuredTemplate.name,
      version: configuredTemplate.version,
      description: configuredTemplate.description,
      fileName,
      blocks: configuredTemplate.blocks.map(normalizeBlock),
    };
  }

  return {
    id: slugifyTemplateId(fileName),
    name: humanizeTemplateName(fileName) || fileName,
    description: `来自 public/pdf-templates/${fileName}，使用通用字段坐标生成。`,
    fileName,
    isAutoDiscovered: true,
    blocks: buildFallbackBlocks(),
  };
}

const discoveredTemplateFileNames = templateFileNames.length
  ? templateFileNames
  : Object.keys(typedTemplateDefinitions);

export const pdfResumeTemplates = discoveredTemplateFileNames.map(
  buildAutoDiscoveredTemplate,
);

export const pdfResumeTemplateMap: Record<string, PdfResumeTemplate> =
  Object.fromEntries(
    pdfResumeTemplates.map((template) => [template.id, template]),
  );

export const defaultPdfTemplateId =
  pdfResumeTemplates.find((template) => template.id === 'modern')?.id ??
  pdfResumeTemplates[0]?.id ??
  '';
