import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ResumeEditorProvider } from './components/editor/ResumeEditorContext';
import { Container } from './components/layout/Container';
import { PageShell } from './components/layout/PageShell';
import { SectionNav } from './components/layout/SectionNav';
import { ResumeDocument } from './components/resume/ResumeDocument';
import { Button } from './components/ui/Button';
import { ToastProvider, useToast } from './components/ui/Toast';
import { resumeProfile } from './data/resume';
import { useActiveSection } from './hooks/useActiveSection';
import { useLanguageMode, type LanguageMode } from './hooks/useLanguageMode';
import { applyGlossaryToProfile } from './lib/i18n/applyGlossary';
import { translateResumeProfile } from './lib/i18n/translateResume';
import { buildMarkdownFileName, exportResumeMarkdown } from './lib/markdown/exportResumeMarkdown';
import { createAiRequest, isAbortError } from './lib/ai/aiRequest';
import { useResumeImport } from './hooks/useResumeImport';
import { useThemeMode } from './hooks/useThemeMode';
import {
  defaultPdfTemplateId,
  pdfResumeTemplateMap,
  pdfResumeTemplates,
} from './lib/pdf/pdfTemplates';
import type { PdfTemplateId } from './types/pdf-template';
import type {
  ResumeAiEditedField,
  ResumeAiTextAction,
  ResumeOptimizationPatch,
  ResumeOptimizationResult,
} from './types/resume-ai';
import type { ResumeProfile } from './types/resume';
import type { ResumeVersion } from './types/resume-workbench';

const PdfPreviewModal = lazy(() =>
  import('./components/pdf/PdfPreviewModal').then((module) => ({
    default: module.PdfPreviewModal,
  })),
);
const ResumeImportModal = lazy(() =>
  import('./components/pdf/ResumeImportModal').then((module) => ({
    default: module.ResumeImportModal,
  })),
);
const ResumeAiWorkbenchModal = lazy(() =>
  import('./components/editor/ResumeAiWorkbenchModal').then((module) => ({
    default: module.ResumeAiWorkbenchModal,
  })),
);
const ApplicationTrackerModal = lazy(() =>
  import('./components/applications/ApplicationTrackerModal').then((module) => ({
    default: module.ApplicationTrackerModal,
  })),
);

type PreviewState = {
  title: string;
  subtitle: string;
  url: string;
  downloadName?: string;
  generated?: boolean;
};

type ImportedPdfSource = {
  file: File;
};

type AiEditedFieldMap = Record<string, ResumeAiEditedField>;

const RESUME_DRAFT_STORAGE_KEY = 'resume-local-draft';
const RESUME_VERSIONS_STORAGE_KEY = 'resume-role-versions';
const RESUME_DRAFT_PREFIX = 'resume-draft-';
const LEGACY_LAYOUT_OVERRIDE_STORAGE_KEY = 'resume-layout-overrides';
const DEFAULT_RESUME_SNAPSHOT = JSON.stringify(resumeProfile);

function cloneResumeProfile(source: ResumeProfile): ResumeProfile {
  return JSON.parse(JSON.stringify(source)) as ResumeProfile;
}

function draftKey(lang: string): string {
  return lang === 'zh' ? RESUME_DRAFT_STORAGE_KEY : `${RESUME_DRAFT_PREFIX}${lang}`;
}

function loadStoredResumeDraft() {
  if (typeof window === 'undefined') {
    return cloneResumeProfile(resumeProfile);
  }

  try {
    const stored = window.localStorage.getItem(RESUME_DRAFT_STORAGE_KEY);
    return stored
      ? (JSON.parse(stored) as ResumeProfile)
      : cloneResumeProfile(resumeProfile);
  } catch {
    return cloneResumeProfile(resumeProfile);
  }
}

function loadStoredLangDraft(lang: string): ResumeProfile | null {
  if (typeof window === 'undefined' || lang === 'zh') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(draftKey(lang));
    return stored ? (JSON.parse(stored) as ResumeProfile) : null;
  } catch {
    return null;
  }
}

/** 从 localStorage 中发现所有已保存的非 zh 语言草稿 key */
function getStoredDraftLanguages(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const languages: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(RESUME_DRAFT_PREFIX)) {
      const lang = key.slice(RESUME_DRAFT_PREFIX.length);
      if (lang) languages.push(lang);
    }
  }
  // 兼容旧版 resume-en-draft key
  if (window.localStorage.getItem('resume-en-draft')) {
    languages.push('en');
  }
  return languages;
}

/** 迁移旧版 resume-en-draft 到新 key */
function migrateLegacyEnDraft(): void {
  if (typeof window === 'undefined') return;
  const legacyKey = 'resume-en-draft';
  const legacy = window.localStorage.getItem(legacyKey);
  if (legacy) {
    window.localStorage.setItem(draftKey('en'), legacy);
    window.localStorage.removeItem(legacyKey);
  }
}

function loadStoredResumeVersions() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(RESUME_VERSIONS_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ResumeVersion[]) : [];
  } catch {
    return [];
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildRoleVersionName(targetRole: string) {
  const normalizedRole = targetRole.trim() || '岗位定制版本';
  const dateLabel = new Date().toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });

  return `${normalizedRole} · ${dateLabel}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function buildExportFileName(
  sourceName: string | undefined,
  templateId: PdfTemplateId,
  language: LanguageMode,
) {
  const baseName = sourceName?.replace(/\.pdf$/i, '') || 'resume';
  return `${baseName}-${templateId}-${language}.pdf`;
}

function getAiEditedLabel(
  action: ResumeAiEditedField['action'],
  t: (key: import('./lib/i18n/uiDict').UIDictKey) => string,
) {
  switch (action) {
    case 'star':
      return t('editor.aiRewrittenLabel');
    case 'optimize':
      return t('editor.aiOptimizedLabel');
    default:
      return t('editor.aiPolishedLabel');
  }
}

function applyOptimizationPatchesToResume(
  resume: ResumeProfile,
  patches: ResumeOptimizationPatch[],
) {
  for (const patch of patches) {
    const segments = patch.path.split('.');
    let cursor: unknown = resume;

    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];

      if (Array.isArray(cursor)) {
        const arrayIndex = Number(segment);
        cursor = Number.isInteger(arrayIndex) ? cursor[arrayIndex] : undefined;
      } else if (cursor && typeof cursor === 'object') {
        cursor = (cursor as Record<string, unknown>)[segment];
      } else {
        cursor = undefined;
      }

      if (cursor == null) {
        break;
      }
    }

    const lastSegment = segments.at(-1);
    if (!lastSegment || cursor == null) {
      continue;
    }

    if (Array.isArray(cursor)) {
      const arrayIndex = Number(lastSegment);
      if (Number.isInteger(arrayIndex) && arrayIndex >= 0 && arrayIndex < cursor.length) {
        cursor[arrayIndex] = patch.suggestedValue;
      }
      continue;
    }

    if (cursor && typeof cursor === 'object') {
      (cursor as Record<string, unknown>)[lastSegment] = patch.suggestedValue;
    }
  }
}

function App() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ResumeProfile>>(() => {
    migrateLegacyEnDraft();
    const zh = loadStoredResumeDraft();
    const result: Record<string, ResumeProfile> = { zh };
    for (const lang of getStoredDraftLanguages()) {
      const draft = loadStoredLangDraft(lang);
      if (draft) result[lang] = draft;
    }
    return result;
  });
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>(
    loadStoredResumeVersions,
  );
  const [pdfSource, setPdfSource] = useState<ImportedPdfSource | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [aiWorkbenchOpen, setAiWorkbenchOpen] = useState(false);
  const [applicationTrackerOpen, setApplicationTrackerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeAiActionKey, setActiveAiActionKey] = useState<string | null>(null);
  const [activeAiActionLabel, setActiveAiActionLabel] =
    useState<ResumeAiTextAction | null>(null);
  const [aiEditedFields, setAiEditedFields] = useState<AiEditedFieldMap>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const translationAbortRef = useRef<{ abort: () => void } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<PdfTemplateId>(defaultPdfTemplateId);
  // 每个 AI 动作维护自己的取消句柄。同一动作重复触发会自动取消上一次。
  const aiAbortHandlesRef = useRef<Map<string, { abort: () => void }>>(new Map());
  const { activeId } = useActiveSection();
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode();
  const { mode: languageMode, setMode: setLanguageMode, t } = useLanguageMode();
  const resumeImport = useResumeImport(resumeProfile, languageMode);
  const toast = useToast();
  const activeResume = profiles[languageMode] ?? profiles.zh;
  // 渲染层"显示版"：当切到非 zh 语言且该语言 profile 尚未由 AI 翻译（仍是 zh 的深拷贝）时，
  // 对 en 走词库兜底翻译，其他语言直接显示中文原文。
  // 已通过 AI 翻译的 profile 则原样使用。
  const displayResume = useMemo(() => {
    if (languageMode === 'zh') return activeResume;
    const langProfile = profiles[languageMode];
    // 该语言没有独立 profile，走 en 词库兜底或显示中文原文
    if (!langProfile) {
      if (languageMode === 'en') return applyGlossaryToProfile(profiles.zh, 'en');
      return profiles.zh;
    }
    return activeResume;
  }, [activeResume, profiles, languageMode]);
  const activeTemplate =
    pdfResumeTemplateMap[selectedTemplateId] ?? pdfResumeTemplates[0];
  const resumeSnapshot = useMemo(
    () => JSON.stringify(activeResume),
    [activeResume],
  );
  const hasResumeDraft = JSON.stringify(profiles.zh) !== DEFAULT_RESUME_SNAPSHOT;
  const hasOtherDrafts = Object.entries(profiles).some(
    ([lang, profile]) => lang !== 'zh' && profile != null,
  );
  // 任何一种语言偏离默认 → 显示"恢复默认"入口
  const hasLocalDraft = hasResumeDraft || hasOtherDrafts;
  const hasImportedPdf = Boolean(pdfSource);
  const canViewPdf = true;
  const canExportPdf = true;
  const canUseAi = Boolean(resumeImport.config.apiKey.trim());
  const exportFileName = buildExportFileName(
    pdfSource?.file.name,
    selectedTemplateId,
    languageMode,
  );
  const pdfSourceLabel = hasImportedPdf
    ? `${t('nav.import')} ${pdfSource?.file.name}`
    : `src/data/resume.ts`;
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(LEGACY_LAYOUT_OVERRIDE_STORAGE_KEY);
  }, []);

  // 同步所有语言草稿到 localStorage
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // zh 草稿 → resume-local-draft
    const zhSnapshot = JSON.stringify(profiles.zh);
    if (zhSnapshot === DEFAULT_RESUME_SNAPSHOT) {
      window.localStorage.removeItem(RESUME_DRAFT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(RESUME_DRAFT_STORAGE_KEY, zhSnapshot);
    }

    // 其他语言草稿 → resume-draft-{lang}
    for (const [lang, profile] of Object.entries(profiles)) {
      if (lang === 'zh') continue;
      const key = draftKey(lang);
      if (profile) {
        window.localStorage.setItem(key, JSON.stringify(profile));
      } else {
        window.localStorage.removeItem(key);
      }
    }
  }, [profiles]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      RESUME_VERSIONS_STORAGE_KEY,
      JSON.stringify(resumeVersions),
    );
  }, [resumeVersions]);

  useEffect(() => {
    return () => {
      if (preview?.generated) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  const replacePreview = useCallback((nextPreview: PreviewState | null) => {
    setPreview((current) => {
      if (current?.generated && current.url !== nextPreview?.url) {
        URL.revokeObjectURL(current.url);
      }

      return nextPreview;
    });
  }, []);

  const setActiveResume = useCallback(
    (updater: (current: ResumeProfile) => ResumeProfile) => {
      setProfiles((prev) => {
        const current = prev[languageMode] ?? prev.zh;
        return { ...prev, [languageMode]: updater(current) };
      });
    },
    [languageMode],
  );

  // 切换语言：
  //   - 切到中文：直接用 zh profile
  //   - 切到其他语言：先切 mode 立即让 UI 响应；
  //     若已配置 API Key 且该语言尚无 profile，则触发 AI 翻译当前中文 → 目标语言
  //   - 翻译失败 → 保留当前状态（en 走词库兜底，其他语言显示中文原文）
  const handleLanguageModeChange = useCallback(
    (next: LanguageMode) => {
      if (next === languageMode) {
        return;
      }
      setLanguageMode(next);

      if (next === 'zh') {
        return;
      }

      // 该语言已有 profile → 直接使用，不重复翻译
      if (profiles[next]) {
        return;
      }

      if (!resumeImport.config.apiKey.trim()) {
        // 没 API Key → 静默不翻译，靠词库或中文原文兜底
        return;
      }

      // 触发 AI 翻译
      translationAbortRef.current?.abort();
      const abortController = new AbortController();
      translationAbortRef.current = { abort: () => abortController.abort() };

      setIsTranslating(true);
      const currentZh = profiles.zh;
      const currentConfig = resumeImport.config;

      translateResumeProfile({
        zhProfile: currentZh,
        config: currentConfig,
        targetLanguage: next,
        signal: abortController.signal,
      })
        .then((translated) => {
          if (!abortController.signal.aborted) {
            setProfiles((prev) => ({ ...prev, [next]: translated }));
          }
        })
        .catch((error) => {
          if (isAbortError(error) || abortController.signal.aborted) {
            return;
          }
          const message =
            error instanceof Error ? error.message : String(error);
          toast.error(
            t('translation.translationFailed'),
            `${t('translation.translationFailedDetail')}（${message}）`,
          );
        })
        .finally(() => {
          if (translationAbortRef.current?.abort === abortController.abort) {
            translationAbortRef.current = null;
          }
          if (!abortController.signal.aborted) {
            setIsTranslating(false);
          }
        });
    },
    [
      languageMode,
      profiles,
      resumeImport.config,
      setLanguageMode,
      toast,
      t,
    ],
  );

  const updateResume = useCallback(
    (updater: (draft: ResumeProfile) => void) => {
      setActiveResume((current) => {
        const draft = cloneResumeProfile(current);
        updater(draft);
        return draft;
      });
    },
    [setActiveResume],
  );

  const markAiEditedFields = useCallback((entries: AiEditedFieldMap) => {
    if (!Object.keys(entries).length) {
      return;
    }

    setAiEditedFields((current) => ({
      ...current,
      ...entries,
    }));
  }, []);

  const clearAiEditedField = useCallback((fieldPath: string, prefix = false) => {
    setAiEditedFields((current) => {
      const nextEntries = Object.entries(current).filter(([path]) =>
        prefix
          ? path !== fieldPath && !path.startsWith(`${fieldPath}.`)
          : path !== fieldPath,
      );

      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, []);

  const getAiEditedState = useCallback(
    (fieldPath: string | undefined, currentValue?: string, prefix = false) => {
      if (!fieldPath) {
        return {
          isAiEdited: false,
          label: null,
        };
      }

      if (prefix) {
        const matchedEntry = Object.entries(aiEditedFields).find(([path]) =>
          path === fieldPath || path.startsWith(`${fieldPath}.`),
        );

        return {
          isAiEdited: Boolean(matchedEntry),
          label: matchedEntry ? getAiEditedLabel(matchedEntry[1].action, t) : null,
        };
      }

      const matchedEntry = aiEditedFields[fieldPath];

      if (!matchedEntry || matchedEntry.value !== (currentValue ?? '')) {
        return {
          isAiEdited: false,
          label: null,
        };
      }

      return {
        isAiEdited: true,
        label: getAiEditedLabel(matchedEntry.action, t),
      };
    },
    [aiEditedFields, t],
  );

  // 包装一个 AI 调用：取消同名上一次的、注册新句柄、抹掉 abort error
  const runWithAbort = useCallback(
    async <T,>(
      actionKey: string,
      fetcher: (signal: AbortSignal) => Promise<T>,
      timeoutMs?: number,
    ): Promise<T> => {
      aiAbortHandlesRef.current.get(actionKey)?.abort();
      const handle = createAiRequest(fetcher, { timeoutMs });
      aiAbortHandlesRef.current.set(actionKey, handle);
      try {
        return await handle.promise;
      } finally {
        if (aiAbortHandlesRef.current.get(actionKey) === handle) {
          aiAbortHandlesRef.current.delete(actionKey);
        }
      }
    },
    [],
  );

  const abortAiAction = useCallback((actionKey: string) => {
    aiAbortHandlesRef.current.get(actionKey)?.abort();
    aiAbortHandlesRef.current.delete(actionKey);
  }, []);

  const runAiTextAction = useCallback(
    async ({
      actionKey,
      action,
      value,
      fieldPath,
      sectionLabel,
      fieldLabel,
      contextHint,
      format,
    }: {
      actionKey: string;
      action: ResumeAiTextAction;
      value: string;
      fieldPath?: string;
      sectionLabel?: string;
      fieldLabel?: string;
      contextHint?: string;
      format?: 'short' | 'paragraph' | 'lines';
    }) => {
      if (!resumeImport.config.apiKey.trim()) {
        throw new Error('请先在 AI 助手中填写可用的 API Key。');
      }

      try {
        setActiveAiActionKey(actionKey);
        setActiveAiActionLabel(action);

        const { polishResumeText } = await import('./lib/ai/resumeAssistant');
        const result = await runWithAbort(actionKey, (signal) =>
          polishResumeText(
            {
              config: resumeImport.config,
              action,
              value,
              sectionLabel,
              fieldLabel,
              contextHint,
              format,
              outputLanguage: languageMode,
            },
            signal,
          ),
        );

        if (fieldPath) {
          markAiEditedFields({
            [fieldPath]: {
              action,
              value: result.rewrittenText,
            },
          });
        }

        return result.rewrittenText;
      } finally {
        setActiveAiActionKey(null);
        setActiveAiActionLabel(null);
      }
    },
    [markAiEditedFields, resumeImport.config, runWithAbort, languageMode],
  );

  const runAtsCheck = useCallback(
    async ({
      targetRole,
      jobDescription,
    }: {
      targetRole?: string;
      jobDescription?: string;
    }) => {
      if (!resumeImport.config.apiKey.trim()) {
        throw new Error('请先配置可用的 AI API Key。');
      }

      const { analyzeResumeAts, buildResumeAiSnapshot } = await import(
        './lib/ai/resumeAssistant'
      );

      return runWithAbort('ats-check', (signal) =>
        analyzeResumeAts(
          {
            config: resumeImport.config,
            resumeJson: buildResumeAiSnapshot(activeResume),
            targetRole,
            jobDescription,
            outputLanguage: languageMode,
          },
          signal,
        ),
      );
    },
    [activeResume, resumeImport.config, runWithAbort, languageMode],
  );

  const runJobOptimization = useCallback(
    async ({
      targetRole,
      jobDescription,
    }: {
      targetRole: string;
      jobDescription?: string;
    }) => {
      if (!resumeImport.config.apiKey.trim()) {
        throw new Error('请先配置可用的 AI API Key。');
      }

      const {
        buildResumeAiSnapshot,
        buildResumeOptimizationCatalog,
        optimizeResumeForTargetRole,
      } = await import('./lib/ai/resumeAssistant');
      const catalog = buildResumeOptimizationCatalog(activeResume);

      return runWithAbort('job-optimization', (signal) =>
        optimizeResumeForTargetRole(
          {
            config: resumeImport.config,
            resumeJson: buildResumeAiSnapshot(activeResume),
            allowedPatchesJson: JSON.stringify(catalog, null, 2),
            targetRole,
            jobDescription,
            outputLanguage: languageMode,
          },
          signal,
        ),
      );
    },
    [activeResume, resumeImport.config, runWithAbort, languageMode],
  );

  const runExtractMaterials = useCallback(async () => {
    if (!resumeImport.config.apiKey.trim()) {
      throw new Error('请先配置可用的 AI API Key。');
    }

    const { buildResumeAiSnapshot, extractResumeMaterials } = await import(
      './lib/ai/resumeAssistant'
    );

    return runWithAbort('extract-materials', (signal) =>
      extractResumeMaterials(
        {
          config: resumeImport.config,
          resumeJson: buildResumeAiSnapshot(activeResume),
          outputLanguage: languageMode,
        },
        signal,
      ),
    );
  }, [activeResume, resumeImport.config, runWithAbort, languageMode]);

  const runExtractInterviewPrompts = useCallback(async () => {
    if (!resumeImport.config.apiKey.trim()) {
      throw new Error('请先配置可用的 AI API Key。');
    }

    const { buildResumeAiSnapshot, extractResumeInterviewPrompts } = await import(
      './lib/ai/resumeAssistant'
    );

    return runWithAbort('extract-interview', (signal) =>
      extractResumeInterviewPrompts(
        {
          config: resumeImport.config,
          resumeJson: buildResumeAiSnapshot(activeResume),
          outputLanguage: languageMode,
        },
        signal,
      ),
    );
  }, [activeResume, resumeImport.config, runWithAbort, languageMode]);

  const runAiConnectionTest = useCallback(async () => {
    if (!resumeImport.config.apiKey.trim()) {
      throw new Error('请先配置可用的 AI API Key。');
    }

    const { testResumeAiConnection } = await import('./lib/ai/resumeAssistant');

    return runWithAbort(
      'connection-test',
      (signal) => testResumeAiConnection(resumeImport.config, signal),
      15000, // 连接测试只需短超时
    );
  }, [resumeImport.config, runWithAbort]);

  const applyJobOptimization = useCallback(
    (
      result: ResumeOptimizationResult,
      meta?: {
        jobDescription?: string;
        atsScore?: number;
        versionName?: string;
      },
    ) => {
      if (!result.patches.length) {
        return;
      }

      const versionResume = cloneResumeProfile(activeResume);
      applyOptimizationPatchesToResume(versionResume, result.patches);

      markAiEditedFields(
        Object.fromEntries(
          result.patches.map((patch) => [
            patch.path,
            {
              action: 'optimize' as const,
              value: patch.suggestedValue,
            },
          ]),
        ),
      );

      updateResume((draft) => {
        applyOptimizationPatchesToResume(draft, result.patches);
      });

      const now = new Date().toISOString();
      const targetRole = result.targetRole || meta?.versionName || '岗位定制版本';
      const nextVersion: ResumeVersion = {
        id: createId(),
        name: meta?.versionName || buildRoleVersionName(targetRole),
        targetRole,
        jobDescription: meta?.jobDescription?.trim() || '',
        createdAt: now,
        updatedAt: now,
        resume: versionResume,
        patches: result.patches,
        keywordCoverage: result.keywordCoverage,
        atsScore: meta?.atsScore,
        notes: result.summary,
      };

      setResumeVersions((current) => [nextVersion, ...current].slice(0, 12));
    },
    [activeResume, markAiEditedFields, updateResume],
  );

  const applyResumeVersion = useCallback(
    (versionId: string) => {
      const version = resumeVersions.find((item) => item.id === versionId);
      if (!version) {
        return;
      }

      setActiveResume(() => cloneResumeProfile(version.resume));
      setAiEditedFields(
        Object.fromEntries(
          version.patches.map((patch) => [
            patch.path,
            {
              action: 'optimize' as const,
              value: patch.suggestedValue,
            },
          ]),
        ),
      );
      replacePreview(null);
      setIsEditing(false);
    },
    [replacePreview, resumeVersions],
  );

  const deleteResumeVersion = useCallback((versionId: string) => {
    setResumeVersions((current) => current.filter((item) => item.id !== versionId));
  }, []);

  const sectionNavItems = useMemo(
    () =>
      [
        { id: 'hero', label: t('section.hero'), visible: true },
        {
          id: 'highlights',
          label: t('section.highlights'),
          visible: isEditing || activeResume.highlights.length > 0,
        },
        {
          id: 'skills',
          label: t('section.skills'),
          visible: isEditing || activeResume.skills.length > 0,
        },
        {
          id: 'experience',
          label: t('section.experience'),
          visible: isEditing || activeResume.experience.length > 0,
        },
        {
          id: 'education',
          label: t('section.education'),
          visible: isEditing || activeResume.education.length > 0,
        },
        {
          id: 'certificates',
          label: t('section.certificates'),
          visible: isEditing || activeResume.certificates.length > 0,
        },
        { id: 'contact', label: t('section.contact'), visible: true },
      ].filter((item) => item.visible),
    [activeResume, isEditing, t],
  );

  const buildTemplatePdf = useCallback(async () => {
    const { generateResumePdfFromTemplate } = await import(
      './lib/pdf/generateResumePdfFromTemplate'
    );

    return generateResumePdfFromTemplate({
      resume: activeResume,
      templateId: selectedTemplateId,
    });
  }, [activeResume, selectedTemplateId]);

  const handlePreviewPdf = useCallback(async () => {
    if (isGeneratingPdf) {
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const blob = await buildTemplatePdf();
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);

      replacePreview({
        title: `${activeTemplate.name} PDF`,
        subtitle: `${pdfSourceLabel} · ${activeTemplate.name}`,
        url,
        downloadName: exportFileName,
        generated: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown PDF generation error.';
      toast.error(t('toast.pdfGenerateError'), message);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [
    activeTemplate.name,
    buildTemplatePdf,
    exportFileName,
    isGeneratingPdf,
    pdfSourceLabel,
    replacePreview,
    toast,
  ]);

  const handleExportPdf = useCallback(async () => {
    if (isGeneratingPdf) {
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const blob = await buildTemplatePdf();
      if (!blob) {
        return;
      }
      downloadBlob(blob, exportFileName);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown PDF export error.';
      toast.error(t('toast.pdfExportError'), message);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [buildTemplatePdf, exportFileName, isGeneratingPdf, toast]);

  const handleExportMarkdown = useCallback(() => {
    try {
      const markdown = exportResumeMarkdown(activeResume, languageMode);
      const fileName = buildMarkdownFileName(activeResume, languageMode);
      downloadBlob(
        new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
        fileName,
      );
      toast.success(t('toast.markdownExported'), fileName);    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Markdown export error.';
      toast.error(t('toast.markdownExportError'), message);
    }
  }, [activeResume, languageMode, t, toast]);

  const handleApplyImportedResume = useCallback(() => {
    const review = resumeImport.review;
    if (!review) {
      return;
    }

    setActiveResume(() => cloneResumeProfile(review.resume));
    setAiEditedFields({});
    setPdfSource({
      file: review.file,
    });
    setImportOpen(false);
    setIsEditing(false);
    replacePreview(null);
  }, [replacePreview, resumeImport.review]);

  const handleRestoreDefault = useCallback(() => {
    // 恢复默认：清空所有语言 profile，仅保留中文 master 数据
    setLanguageMode('zh');
    setProfiles({ zh: cloneResumeProfile(resumeProfile) });
    setAiEditedFields({});
    setPdfSource(null);
    replacePreview(null);
    setAiWorkbenchOpen(false);
    setApplicationTrackerOpen(false);
    setIsEditing(false);
    setSelectedTemplateId(defaultPdfTemplateId);
  }, [setLanguageMode]);

  return (
    <ResumeEditorProvider
      value={{
        isEditing,
        updateResume,
        aiConfig: resumeImport.config,
        canUseAi,
        activeAiActionKey,
        activeAiActionLabel,
        updateAiConfig: resumeImport.updateConfig,
        runAiTextAction,
        markAiEditedFields,
        clearAiEditedField,
        getAiEditedState,
      }}
    >
      <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] transition-colors duration-300">
        <PageShell
          themeMode={themeMode}
          resolvedTheme={resolvedTheme}
          onViewPdf={() => {
            void handlePreviewPdf();
          }}
          onExportPdf={() => {
            void handleExportPdf();
          }}
          onExportMarkdown={handleExportMarkdown}
          canViewPdf={canViewPdf}
          canExportPdf={canExportPdf}
          showEditing
          showImport
          showViewPdf
          showExportPdf
          showExportMarkdown
          showTemplateSelect
          showAiWorkbench
          showApplicationTracker
          isEditing={isEditing}
          isPdfBusy={isGeneratingPdf}
          hasSessionResume={hasLocalDraft}
          selectedTemplateId={selectedTemplateId}
          templateOptions={pdfResumeTemplates.map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description,
          }))}
          onTemplateChange={setSelectedTemplateId}
          onOpenImport={() => setImportOpen(true)}
          onOpenAiWorkbench={() => setAiWorkbenchOpen(true)}
          onOpenApplicationTracker={() => setApplicationTrackerOpen(true)}
          onRestoreDefault={handleRestoreDefault}
          onThemeModeChange={setThemeMode}
          onLanguageModeChange={handleLanguageModeChange}
          showLanguageToggle={canUseAi}
          onToggleEditing={() => setIsEditing((current) => !current)}
        >
          <main className="pt-[3.75rem] sm:pt-[3.75rem] lg:pt-[3.75rem]">
            {hasLocalDraft ? (
              <section className="no-print border-b border-[var(--line)] bg-emerald-50/70 py-4">
                <Container>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        {t('draftBanner.title')}
                      </p>
                      <p className="mt-1 text-sm text-emerald-700">
                        {t('draftBanner.description')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRestoreDefault}
                      icon={<RotateCcw className="size-4" />}
                    >
                      {t('nav.restore')}
                    </Button>
                  </div>
                </Container>
              </section>
            ) : null}

            {isTranslating ? (
              <section className="no-print border-b border-[var(--line)] bg-blue-50/70 py-4">
                <Container>
                  <div className="flex items-center gap-3">
                    <div className="size-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">
                        {t('translation.translatingTitle')}
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        {t('translation.translatingDescription')}
                      </p>
                    </div>
                  </div>
                </Container>
              </section>
            ) : null}

            <ResumeDocument
              resume={displayResume}
              isEditing={isEditing}
            />
          </main>
        </PageShell>

        <SectionNav items={sectionNavItems} activeId={activeId} />

        <Suspense fallback={null}>
          {preview ? (
            <PdfPreviewModal
              isOpen={Boolean(preview)}
              preview={preview}
              onClose={() => replacePreview(null)}
            />
          ) : null}

          {importOpen ? (
            <ResumeImportModal
              isOpen={importOpen}
              config={resumeImport.config}
              status={resumeImport.status}
              error={resumeImport.error}
              review={resumeImport.review}
              onApply={handleApplyImportedResume}
              onClose={() => setImportOpen(false)}
              onConfigChange={resumeImport.updateConfig}
              onReset={resumeImport.resetImport}
              onSelectFile={(file) => {
                void resumeImport.importPdf(file);
              }}
              onImportText={(text) => {
                void resumeImport.importText(text);
              }}
            />
          ) : null}

          {aiWorkbenchOpen ? (
            <ResumeAiWorkbenchModal
              isOpen={aiWorkbenchOpen}
              config={resumeImport.config}
              resume={activeResume}
              resumeFingerprint={resumeSnapshot}
              resumeVersions={resumeVersions}
              onClose={() => setAiWorkbenchOpen(false)}
              onConfigChange={resumeImport.updateConfig}
              onTestConnection={runAiConnectionTest}
              onRunAtsCheck={runAtsCheck}
              onRunJobOptimization={runJobOptimization}
              onApplyOptimization={applyJobOptimization}
              onApplyVersion={applyResumeVersion}
              onDeleteVersion={deleteResumeVersion}
              onExtractMaterials={runExtractMaterials}
              onExtractInterviewPrompts={runExtractInterviewPrompts}
              onAbortAiAction={abortAiAction}
              onClearApiKey={resumeImport.clearApiKey}
            />
          ) : null}

          {applicationTrackerOpen ? (
            <ApplicationTrackerModal
              isOpen={applicationTrackerOpen}
              resumeVersions={resumeVersions}
              onClose={() => setApplicationTrackerOpen(false)}
            />
          ) : null}
        </Suspense>
      </div>
    </ResumeEditorProvider>
  );
}

function AppWithToast() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

export default AppWithToast;
