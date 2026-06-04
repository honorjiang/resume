import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {
  PdfLayoutColumn,
  PdfLayoutModel,
  PdfTextBlock,
  PdfLayoutPage,
} from '../../types/pdf-layout';

GlobalWorkerOptions.workerSrc = workerUrl;

type RawTextItem = {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
  hasEOL?: boolean;
};

type LineAccumulator = {
  y: number;
  text: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  fontSize: number;
};

function sortItems(items: RawTextItem[]) {
  return [...items].sort((left, right) => {
    const leftY = left.transform?.[5] ?? 0;
    const rightY = right.transform?.[5] ?? 0;

    if (Math.abs(rightY - leftY) > 2) {
      return rightY - leftY;
    }

    const leftX = left.transform?.[4] ?? 0;
    const rightX = right.transform?.[4] ?? 0;

    return leftX - rightX;
  });
}

function mergeToken(previous: string, current: string) {
  if (!previous) {
    return current;
  }

  const noSpaceBefore = /^[,.;:!?%)}\]，。；：！？、）》]/.test(current);
  const noSpaceAfter = /[([{（【《]$/.test(previous);
  const cjkEdge =
    /[\u3400-\u9fff]$/.test(previous) && /^[\u3400-\u9fff]/.test(current);

  if (noSpaceBefore || noSpaceAfter || cjkEdge) {
    return `${previous}${current}`;
  }

  return `${previous} ${current}`;
}

function finalizeLine(
  pageIndex: number,
  lineIndex: number,
  line: LineAccumulator,
): PdfTextBlock | null {
  const text = line.text.trim();

  if (!text) {
    return null;
  }

  return {
    id: `page-${pageIndex}-line-${lineIndex}`,
    pageIndex,
    text,
    x: line.minX,
    y: line.minY,
    width: Math.max(1, line.maxX - line.minX),
    height: Math.max(1, line.maxY - line.minY),
    fontSize: Math.max(8, line.fontSize),
    order: lineIndex,
    columnId: '',
  };
}

type ColumnAccumulator = {
  blocks: PdfTextBlock[];
  minX: number;
  maxX: number;
  top: number;
  bottom: number;
};

function assignColumns(pageIndex: number, blocks: PdfTextBlock[]): PdfLayoutColumn[] {
  const columns: ColumnAccumulator[] = [];

  const sortedByX = [...blocks].sort((left, right) => {
    if (Math.abs(left.x - right.x) > 12) {
      return left.x - right.x;
    }

    return right.y - left.y;
  });

  for (const block of sortedByX) {
    const blockLeft = block.x;
    const blockRight = block.x + block.width;
    const blockCenter = blockLeft + block.width / 2;
    let matchedColumn: ColumnAccumulator | null = null;

    for (const column of columns) {
      const overlap =
        Math.min(blockRight, column.maxX) - Math.max(blockLeft, column.minX);
      const minWidth = Math.min(block.width, column.maxX - column.minX);
      const overlapRatio = minWidth > 0 ? overlap / minWidth : 0;
      const columnCenter = column.minX + (column.maxX - column.minX) / 2;

      if (overlapRatio > 0.35 || Math.abs(blockCenter - columnCenter) < 48) {
        matchedColumn = column;
        break;
      }
    }

    if (!matchedColumn) {
      matchedColumn = {
        blocks: [],
        minX: blockLeft,
        maxX: blockRight,
        top: block.y + block.height,
        bottom: block.y,
      };
      columns.push(matchedColumn);
    }

    matchedColumn.blocks.push(block);
    matchedColumn.minX = Math.min(matchedColumn.minX, blockLeft);
    matchedColumn.maxX = Math.max(matchedColumn.maxX, blockRight);
    matchedColumn.top = Math.max(matchedColumn.top, block.y + block.height);
    matchedColumn.bottom = Math.min(matchedColumn.bottom, block.y);
  }

  const normalizedColumns = columns
    .sort((left, right) => left.minX - right.minX)
    .map((column, index) => {
      const columnId = `page-${pageIndex}-column-${index}`;

      for (const block of column.blocks) {
        block.columnId = columnId;
      }

      return {
        id: columnId,
        pageIndex,
        x: column.minX,
        width: Math.max(1, column.maxX - column.minX),
        top: column.top,
        bottom: column.bottom,
      } satisfies PdfLayoutColumn;
    });

  blocks.sort((left, right) => {
    if (left.pageIndex !== right.pageIndex) {
      return left.pageIndex - right.pageIndex;
    }

    if (left.columnId !== right.columnId) {
      return left.columnId.localeCompare(right.columnId);
    }

    if (Math.abs(right.y - left.y) > 2) {
      return right.y - left.y;
    }

    return left.x - right.x;
  });

  blocks.forEach((block, index) => {
    block.order = index;
  });

  return normalizedColumns;
}

function buildPageBlocks(pageIndex: number, items: RawTextItem[]) {
  const blocks: PdfTextBlock[] = [];
  let currentLine: LineAccumulator | null = null;
  let lineIndex = 0;

  for (const item of sortItems(items)) {
    const token = item.str?.trim();

    if (!token) {
      continue;
    }

    const transform = item.transform ?? [];
    const x = transform[4] ?? 0;
    const y = transform[5] ?? 0;
    const width = item.width ?? 0;
    const fontSize =
      Math.max(Math.abs(transform[0] ?? 0), Math.abs(transform[3] ?? 0), item.height ?? 0) ||
      12;
    const bottom = y - fontSize * 0.85;
    const top = y + fontSize * 0.35;

    if (!currentLine || Math.abs(currentLine.y - y) > 4) {
      if (currentLine) {
        const block = finalizeLine(pageIndex, lineIndex, currentLine);

        if (block) {
          blocks.push(block);
        }
      }

      currentLine = {
        y,
        text: token,
        minX: x,
        maxX: x + width,
        minY: bottom,
        maxY: top,
        fontSize,
      };
      lineIndex += 1;
      continue;
    }

    currentLine.text = mergeToken(currentLine.text, token);
    currentLine.minX = Math.min(currentLine.minX, x);
    currentLine.maxX = Math.max(currentLine.maxX, x + width);
    currentLine.minY = Math.min(currentLine.minY, bottom);
    currentLine.maxY = Math.max(currentLine.maxY, top);
    currentLine.fontSize = Math.max(currentLine.fontSize, fontSize);

    if (item.hasEOL) {
      const block = finalizeLine(pageIndex, lineIndex, currentLine);

      if (block) {
        blocks.push(block);
      }

      currentLine = null;
    }
  }

  if (currentLine) {
    const block = finalizeLine(pageIndex, lineIndex, currentLine);

    if (block) {
      blocks.push(block);
    }
  }

  const columns = assignColumns(pageIndex, blocks);

  return {
    blocks,
    columns,
  };
}

export async function extractPdfLayoutModel(file: File): Promise<PdfLayoutModel> {
  const buffer = await file.arrayBuffer();
  const document = await getDocument({ data: buffer }).promise;
  const pages: PdfLayoutPage[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const { blocks, columns } = buildPageBlocks(
      pageNumber - 1,
      content.items as RawTextItem[],
    );

    pages.push({
      pageIndex: pageNumber - 1,
      width: viewport.width,
      height: viewport.height,
      columns,
      blocks,
    });
  }

  return {
    pageCount: pages.length,
    pages,
  };
}
