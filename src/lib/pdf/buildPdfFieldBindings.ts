import { flattenResumeTextEntries, normalizeComparableText } from './flattenResumeTextEntries';
import type { PdfFieldBinding, PdfLayoutModel, PdfTextBlock } from '../../types/pdf-layout';
import type { ResumeProfile } from '../../types/resume';

type LayoutCandidate = {
  pageIndex: number;
  columnId: string;
  blockIds: string[];
  text: string;
  order: number;
};

type AnchorCandidate = {
  pageIndex: number;
  columnId: string;
  order: number;
};

const CANDIDATE_SPLIT_PATTERN =
  /[\s|｜丨/:：·•,，;；()（）[\]【】]+/;

function isMultilinePath(path: string) {
  return /(?:subtitle|summary|intent|description|background|actions\.\d+|outcomes\.\d+|achievements\.\d+)$/.test(
    path,
  );
}

function pathGroupKey(path: string) {
  const segments = path.split('.');

  if (segments.length >= 2 && /^\d+$/.test(segments[1])) {
    return `${segments[0]}.${segments[1]}`;
  }

  return segments[0] ?? path;
}

function buildColumnCandidates(blocks: PdfTextBlock[], allowMultiline: boolean) {
  const candidates: LayoutCandidate[] = [];
  const maxSpan = allowMultiline ? 3 : 1;

  for (let startIndex = 0; startIndex < blocks.length; startIndex += 1) {
    const startBlock = blocks[startIndex];
    let combinedText = '';
    const blockIds: string[] = [];

    for (
      let endIndex = startIndex;
      endIndex < blocks.length && endIndex < startIndex + maxSpan;
      endIndex += 1
    ) {
      const currentBlock = blocks[endIndex];

      if (endIndex > startIndex) {
        const previousBlock = blocks[endIndex - 1];
        const gap = previousBlock.y - (currentBlock.y + currentBlock.height);

        if (gap > previousBlock.fontSize * 2.4) {
          break;
        }
      }

      blockIds.push(currentBlock.id);
      combinedText = normalizeComparableText(
        combinedText ? `${combinedText} ${currentBlock.text}` : currentBlock.text,
      );

      candidates.push({
        pageIndex: startBlock.pageIndex,
        columnId: startBlock.columnId,
        blockIds: [...blockIds],
        text: combinedText,
        order: startBlock.order,
      });
    }
  }

  return candidates;
}

function buildLayoutCandidates(layoutModel: PdfLayoutModel, allowMultiline: boolean) {
  const candidates: LayoutCandidate[] = [];

  for (const page of layoutModel.pages) {
    const groupedBlocks = new Map<string, PdfTextBlock[]>();

    for (const block of page.blocks) {
      const list = groupedBlocks.get(block.columnId) ?? [];
      list.push(block);
      groupedBlocks.set(block.columnId, list);
    }

    for (const blocks of groupedBlocks.values()) {
      const orderedBlocks = [...blocks].sort((left, right) => left.order - right.order);
      candidates.push(...buildColumnCandidates(orderedBlocks, allowMultiline));
    }
  }

  return candidates;
}

function extractCandidateParts(text: string) {
  const normalized = normalizeComparableText(text);
  const parts = normalized
    .split(CANDIDATE_SPLIT_PATTERN)
    .map((part) => normalizeComparableText(part))
    .filter(Boolean);

  return Array.from(new Set([normalized, ...parts]));
}

function toCharacterBigrams(value: string) {
  const normalized = normalizeComparableText(value).toLowerCase();

  if (normalized.length < 2) {
    return new Set([normalized]);
  }

  const tokens = new Set<string>();

  for (let index = 0; index < normalized.length - 1; index += 1) {
    tokens.add(normalized.slice(index, index + 2));
  }

  return tokens;
}

function calculateTextSimilarity(left: string, right: string) {
  const normalizedLeft = normalizeComparableText(left);
  const normalizedRight = normalizeComparableText(right);

  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    const sharedLength = Math.min(normalizedLeft.length, normalizedRight.length);
    const baseLength = Math.max(normalizedLeft.length, normalizedRight.length);
    const coverage = sharedLength / Math.max(1, baseLength);

    if (sharedLength <= 4) {
      return 0.84 + Math.min(0.12, coverage * 0.12);
    }

    return 0.88 + Math.min(0.1, coverage * 0.1);
  }

  const leftBigrams = toCharacterBigrams(normalizedLeft);
  const rightBigrams = toCharacterBigrams(normalizedRight);
  let overlap = 0;

  for (const token of leftBigrams) {
    if (rightBigrams.has(token)) {
      overlap += 1;
    }
  }

  return (2 * overlap) / Math.max(1, leftBigrams.size + rightBigrams.size);
}

function scoreCandidate(
  path: string,
  value: string,
  candidate: LayoutCandidate,
  anchor: AnchorCandidate | null,
) {
  const similarity = Math.max(
    ...extractCandidateParts(candidate.text).map((part) =>
      calculateTextSimilarity(value, part),
    ),
  );

  if (similarity < 0.45) {
    return 0;
  }

  if (!isMultilinePath(path) && candidate.blockIds.length > 1 && similarity < 0.88) {
    return 0;
  }

  let score = similarity;

  if (anchor) {
    if (candidate.pageIndex === anchor.pageIndex) {
      score += 0.05;
    }

    if (candidate.columnId === anchor.columnId) {
      score += 0.08;
    }

    if (candidate.order >= anchor.order) {
      score += 0.04;
    }

    if (Math.abs(candidate.order - anchor.order) <= 6) {
      score += 0.03;
    }
  }

  if (candidate.blockIds.length > 1 && isMultilinePath(path)) {
    score += 0.03;
  }

  return score;
}

export function buildPdfFieldBindings(
  resume: ResumeProfile,
  layoutModel: PdfLayoutModel,
): PdfFieldBinding[] {
  const entries = flattenResumeTextEntries(resume);
  const singleLineCandidates = buildLayoutCandidates(layoutModel, false);
  const multiLineCandidates = buildLayoutCandidates(layoutModel, true);
  const usedBlockIds = new Set<string>();
  const groupAnchors = new Map<string, AnchorCandidate>();
  const bindings: PdfFieldBinding[] = [];

  for (const entry of entries) {
    const anchor = groupAnchors.get(pathGroupKey(entry.path)) ?? null;
    const candidatePool = isMultilinePath(entry.path)
      ? multiLineCandidates
      : singleLineCandidates;
    const rankedCandidates = candidatePool
      .filter((candidate) =>
        candidate.blockIds.every((blockId) => !usedBlockIds.has(blockId)),
      )
      .map((candidate) => ({
        candidate,
        score: scoreCandidate(entry.path, entry.value, candidate, anchor),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score);
    const bestMatch = rankedCandidates[0];

    if (!bestMatch || bestMatch.score < 0.58) {
      continue;
    }

    bestMatch.candidate.blockIds.forEach((blockId) => {
      usedBlockIds.add(blockId);
    });

    bindings.push({
      path: entry.path,
      pageIndex: bestMatch.candidate.pageIndex,
      columnId: bestMatch.candidate.columnId,
      blockIds: bestMatch.candidate.blockIds,
      originalText: entry.value,
      confidence: Math.min(1, bestMatch.score),
    });

    groupAnchors.set(pathGroupKey(entry.path), {
      pageIndex: bestMatch.candidate.pageIndex,
      columnId: bestMatch.candidate.columnId,
      order: bestMatch.candidate.order,
    });
  }

  return bindings;
}
