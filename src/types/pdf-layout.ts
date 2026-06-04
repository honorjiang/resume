export interface PdfTextBlock {
  id: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  order: number;
  columnId: string;
}

export interface PdfLayoutColumn {
  id: string;
  pageIndex: number;
  x: number;
  width: number;
  top: number;
  bottom: number;
}

export interface PdfLayoutPage {
  pageIndex: number;
  width: number;
  height: number;
  columns: PdfLayoutColumn[];
  blocks: PdfTextBlock[];
}

export interface PdfFieldBinding {
  path: string;
  pageIndex: number;
  columnId: string;
  blockIds: string[];
  originalText: string;
  confidence: number;
}

export interface PdfLayoutModel {
  pageCount: number;
  pages: PdfLayoutPage[];
}
