import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

type TextChunk = {
  str?: string;
  transform?: number[];
  hasEOL?: boolean;
};

function sortChunks(chunks: TextChunk[]) {
  return [...chunks].sort((left, right) => {
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

  const noSpaceBefore = /^[,.;:!?%)}\]，。；：！？、）》】]/.test(current);
  const noSpaceAfter = /[([{（【《]$/.test(previous);
  const cjkEdge =
    /[\u3400-\u9fff]$/.test(previous) && /^[\u3400-\u9fff]/.test(current);

  if (noSpaceBefore || noSpaceAfter || cjkEdge) {
    return `${previous}${current}`;
  }

  return `${previous} ${current}`;
}

function chunksToLines(chunks: TextChunk[]) {
  const lines: string[] = [];
  let currentLine = '';
  let currentY: number | null = null;

  for (const chunk of sortChunks(chunks)) {
    const token = chunk.str?.trim();
    if (!token) {
      continue;
    }

    const y = chunk.transform?.[5] ?? 0;

    if (currentY !== null && Math.abs(currentY - y) > 4) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = token;
      currentY = y;
      continue;
    }

    currentLine = mergeToken(currentLine, token);
    currentY = y;

    if (chunk.hasEOL) {
      lines.push(currentLine.trim());
      currentLine = '';
      currentY = null;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
}

export async function extractPdfText(file: File) {
  const buffer = await file.arrayBuffer();
  const document = await getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = chunksToLines(content.items as TextChunk[]);
    pages.push(lines.join('\n'));
  }

  return pages.join('\n\n');
}
