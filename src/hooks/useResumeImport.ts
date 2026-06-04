import { useCallback, useEffect, useState } from 'react';
import type { ResumeProfile } from '../types/resume';
import type {
  ResumeImportAiConfig,
  ResumeImportReview,
  ResumeImportStatus,
} from '../types/resume-import';

const MAX_IMPORT_SIZE = 10 * 1024 * 1024;
const STORAGE_KEY = 'resume-import-ai-config';

const DEFAULT_AI_CONFIG: ResumeImportAiConfig = {
  provider: 'openai-responses',
  apiKey: '',
  model: 'gpt-5',
  baseUrl: 'https://api.openai.com/v1',
};

function isPdfFile(file: File) {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('无法读取 PDF 文件内容。'));
    };

    reader.onerror = () => {
      reject(new Error('读取 PDF 文件失败。'));
    };

    reader.readAsDataURL(file);
  });
}

function loadInitialConfig() {
  if (typeof window === 'undefined') {
    return DEFAULT_AI_CONFIG;
  }

  const savedValue = window.sessionStorage.getItem(STORAGE_KEY);

  if (!savedValue) {
    return DEFAULT_AI_CONFIG;
  }

  try {
    const parsed = JSON.parse(savedValue) as Partial<ResumeImportAiConfig>;

    return {
      provider:
        parsed.provider === 'openai-compatible' ||
        parsed.provider === 'anthropic-compatible' ||
        parsed.provider === 'openai-responses'
          ? parsed.provider
          : DEFAULT_AI_CONFIG.provider,
      apiKey:
        typeof parsed.apiKey === 'string'
          ? parsed.apiKey
          : DEFAULT_AI_CONFIG.apiKey,
      model:
        typeof parsed.model === 'string' && parsed.model.trim()
          ? parsed.model
          : DEFAULT_AI_CONFIG.model,
      baseUrl:
        typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim()
          ? parsed.baseUrl
          : DEFAULT_AI_CONFIG.baseUrl,
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function useResumeImport(fallbackResume: ResumeProfile) {
  const [status, setStatus] = useState<ResumeImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ResumeImportReview | null>(null);
  const [config, setConfig] = useState<ResumeImportAiConfig>(loadInitialConfig);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateConfig = useCallback(
    (patch: Partial<ResumeImportAiConfig>) => {
      setConfig((current) => ({
        ...current,
        ...patch,
      }));
    },
    [],
  );

  const resetImport = useCallback(() => {
    setStatus('idle');
    setError(null);
    setReview(null);
  }, []);

  const importPdf = useCallback(
    async (file: File) => {
      if (!isPdfFile(file)) {
        setStatus('error');
        setError('仅支持导入 PDF 文件。');
        return;
      }

      if (file.size > MAX_IMPORT_SIZE) {
        setStatus('error');
        setError('PDF 文件大小不能超过 10MB。');
        return;
      }

      if (!config.apiKey.trim()) {
        setStatus('error');
        setError('请先填写 AI API Key，再导入 PDF。');
        return;
      }

      if (!config.model.trim()) {
        setStatus('error');
        setError('请先填写用于提取的模型名称。');
        return;
      }

      try {
        setStatus('extracting');
        setError(null);
        setReview(null);

        const [
          { draftToResumeProfile },
          { extractPdfText },
          { extractResumeDraftWithAi },
          { normalizeResumeText },
        ] = await Promise.all([
          import('../lib/pdf/draftToResumeProfile'),
          import('../lib/pdf/extractPdfText'),
          import('../lib/pdf/extractResumeDraftWithAi'),
          import('../lib/pdf/normalizeResumeText'),
        ]);

        const [fileData, rawTextResult] = await Promise.all([
          readFileAsDataUrl(file),
          extractPdfText(file).catch(() => ''),
        ]);

        const rawText = rawTextResult
          ? normalizeResumeText(rawTextResult)
          : '';

        if (config.provider !== 'openai-responses' && !rawText) {
          setStatus('error');
          setError(
            '当前兼容协议依赖本地提取文本。该 PDF 未提取到可用文本，无法继续导入。',
          );
          return;
        }

        setStatus('parsing');

        const draft = await extractResumeDraftWithAi({
          config,
          file,
          fileData,
          rawText,
        });
        const warnings = [...draft.warnings];

        if (!rawText) {
          warnings.push(
            '未提取到本地文本预览，本次结果完全依赖 AI 对 PDF 版面的理解。',
          );
        }

        const draftWithWarnings = {
          ...draft,
          warnings,
        };
        const resume = draftToResumeProfile(draftWithWarnings, fallbackResume);

        setReview({
          file,
          draft: draftWithWarnings,
          resume,
          meta: {
            model: config.model.trim(),
            usedLocalTextPreview: rawText.length > 0,
          },
        });
        setStatus('ready');
      } catch (caughtError) {
        setStatus('error');
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'PDF 导入失败，请重试。',
        );
      }
    },
    [config, fallbackResume],
  );

  return {
    config,
    error,
    importPdf,
    resetImport,
    review,
    status,
    updateConfig,
  };
}
