export type PdfTemplateId = string;

export type PdfTextAlign = 'left' | 'center' | 'right';

export interface PdfTemplateTextBlock {
  key: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  color?: string;
  align?: PdfTextAlign;
  bold?: boolean;
  wrapMode?: 'wrap' | 'clip-line';
}

export interface PdfResumeTemplate {
  id: PdfTemplateId;
  name: string;
  description: string;
  version?: string;
  fileName: string;
  isAutoDiscovered?: boolean;
  blocks: PdfTemplateTextBlock[];
}
