import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ResumeEditorProvider } from './components/editor/ResumeEditorContext';
import { Container } from './components/layout/Container';
import { PageShell } from './components/layout/PageShell';
import { SectionNav } from './components/layout/SectionNav';
import { ResumeDocument } from './components/resume/ResumeDocument';
import { Button } from './components/ui/Button';
import { resumeProfile } from './data/resume';
import { useActiveSection } from './hooks/useActiveSection';
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
const LEGACY_LAYOUT_OVERRIDE_STORAGE_KEY = 'resume-layout-overrides';
const DEFAULT_RESUME_SNAPSHOT = JSON.stringify(resumeProfile);

function cloneResumeProfile(source: ResumeProfile): ResumeProfile {
  return JSON.parse(JSON.stringify(source)) as ResumeProfile;
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
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildExportFileName(sourceName: string | undefined, templateId: PdfTemplateId) {
  const baseName = sourceName?.replace(/\.pdf$/i, '') || 'resume';
  return `${baseName}-${templateId}.pdf`;
}

function getAiEditedLabel(action: ResumeAiEditedField['action']) {
  switch (action) {
    case 'star':
      return 'AI 改写结果';
    case 'optimize':
      return 'AI 优化结果';
    default:
      return 'AI 润色结果';
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
  const [editableResume, setEditableResume] = useState<ResumeProfile>(
    loadStoredResumeDraft,
  );
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
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<PdfTemplateId>(defaultPdfTemplateId);
  const { activeId } = useActiveSection();
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode();
  const resumeImport = useResumeImport(resumeProfile);
  const activeResume = editableResume;
  const activeTemplate =
    pdfResumeTemplateMap[selectedTemplateId] ?? pdfResumeTemplates[0];
  const resumeSnapshot = useMemo(
    () => JSON.stringify(editableResume),
    [editableResume],
  );
  const hasResumeDraft = resumeSnapshot !== DEFAULT_RESUME_SNAPSHOT;
  const hasLocalDraft = hasResumeDraft;
  const hasImportedPdf = Boolean(pdfSource);
  const canViewPdf = true;
  const canExportPdf = true;
  const canUseAi = Boolean(resumeImport.config.apiKey.trim());
  const exportFileName = buildExportFileName(pdfSource?.file.name, selectedTemplateId);
  const pdfSourceLabel = hasImportedPdf
    ? `导入自 ${pdfSource?.file.name}`
    : '使用内置 src/data/resume.ts 简历';
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(LEGACY_LAYOUT_OVERRIDE_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (resumeSnapshot === DEFAULT_RESUME_SNAPSHOT) {
      window.localStorage.removeItem(RESUME_DRAFT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(RESUME_DRAFT_STORAGE_KEY, resumeSnapshot);
  }, [resumeSnapshot]);

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

  const updateResume = useCallback((updater: (draft: ResumeProfile) => void) => {
    setEditableResume((current) => {
      const draft = cloneResumeProfile(current);
      updater(draft);
      return draft;
    });
  }, []);

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
          label: matchedEntry ? getAiEditedLabel(matchedEntry[1].action) : null,
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
        label: getAiEditedLabel(matchedEntry.action),
      };
    },
    [aiEditedFields],
  );

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
        const result = await polishResumeText({
          config: resumeImport.config,
          action,
          value,
          sectionLabel,
          fieldLabel,
          contextHint,
          format,
        });

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
    [markAiEditedFields, resumeImport.config],
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

      return analyzeResumeAts({
        config: resumeImport.config,
        resumeJson: buildResumeAiSnapshot(activeResume),
        targetRole,
        jobDescription,
      });
    },
    [activeResume, resumeImport.config],
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

      return optimizeResumeForTargetRole({
        config: resumeImport.config,
        resumeJson: buildResumeAiSnapshot(activeResume),
        allowedPatchesJson: JSON.stringify(catalog, null, 2),
        targetRole,
        jobDescription,
      });
    },
    [activeResume, resumeImport.config],
  );

  const runExtractMaterials = useCallback(async () => {
    if (!resumeImport.config.apiKey.trim()) {
      throw new Error('请先配置可用的 AI API Key。');
    }

    const { buildResumeAiSnapshot, extractResumeMaterials } = await import(
      './lib/ai/resumeAssistant'
    );

    return extractResumeMaterials({
      config: resumeImport.config,
      resumeJson: buildResumeAiSnapshot(activeResume),
    });
  }, [activeResume, resumeImport.config]);

  const runExtractInterviewPrompts = useCallback(async () => {
    if (!resumeImport.config.apiKey.trim()) {
      throw new Error('请先配置可用的 AI API Key。');
    }

    const { buildResumeAiSnapshot, extractResumeInterviewPrompts } = await import(
      './lib/ai/resumeAssistant'
    );

    return extractResumeInterviewPrompts({
      config: resumeImport.config,
      resumeJson: buildResumeAiSnapshot(activeResume),
    });
  }, [activeResume, resumeImport.config]);

  const runAiConnectionTest = useCallback(async () => {
    if (!resumeImport.config.apiKey.trim()) {
      throw new Error('请先配置可用的 AI API Key。');
    }

    const { testResumeAiConnection } = await import('./lib/ai/resumeAssistant');

    return testResumeAiConnection(resumeImport.config);
  }, [resumeImport.config]);

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

      setEditableResume(cloneResumeProfile(version.resume));
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
        { id: 'hero', label: '首页', visible: true },
        {
          id: 'highlights',
          label: '核心亮点',
          visible: isEditing || activeResume.highlights.length > 0,
        },
        {
          id: 'skills',
          label: '技能矩阵',
          visible: isEditing || activeResume.skills.length > 0,
        },
        {
          id: 'experience',
          label: '工作经历',
          visible: isEditing || activeResume.experience.length > 0,
        },
        {
          id: 'education',
          label: '教育背景',
          visible: isEditing || activeResume.education.length > 0,
        },
        {
          id: 'certificates',
          label: '证书荣誉',
          visible: isEditing || activeResume.certificates.length > 0,
        },
        { id: 'contact', label: '联系信息', visible: true },
      ].filter((item) => item.visible),
    [activeResume, isEditing],
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
        subtitle: `${pdfSourceLabel}，基于当前编辑内容生成「${activeTemplate.name}」模板预览`,
        url,
        downloadName: exportFileName,
        generated: true,
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Unknown PDF generation error.';
      window.alert(`生成 PDF 失败：${message}`);
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
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Unknown PDF export error.';
      window.alert(`导出 PDF 失败：${message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [buildTemplatePdf, exportFileName, isGeneratingPdf]);

  const handleApplyImportedResume = useCallback(() => {
    if (!resumeImport.review) {
      return;
    }

    setEditableResume(cloneResumeProfile(resumeImport.review.resume));
    setAiEditedFields({});
    setPdfSource({
      file: resumeImport.review.file,
    });
    setImportOpen(false);
    setIsEditing(false);
    replacePreview(null);
  }, [replacePreview, resumeImport.review]);

  const handleRestoreDefault = useCallback(() => {
    setEditableResume(cloneResumeProfile(resumeProfile));
    setAiEditedFields({});
    setPdfSource(null);
    replacePreview(null);
    setAiWorkbenchOpen(false);
    setApplicationTrackerOpen(false);
    setIsEditing(false);
    setSelectedTemplateId(defaultPdfTemplateId);
  }, [replacePreview]);

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
          canViewPdf={canViewPdf}
          canExportPdf={canExportPdf}
          showEditing
          showImport
          showViewPdf
          showExportPdf
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
          onToggleEditing={() => setIsEditing((current) => !current)}
        >
          <main className="pt-[3.75rem] sm:pt-[3.75rem] lg:pt-[3.75rem]">
            {hasLocalDraft ? (
              <section className="no-print border-b border-[var(--line)] bg-emerald-50/70 py-4">
                <Container>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        当前展示的是保存在浏览器本地的简历草稿。
                      </p>
                      <p className="mt-1 text-sm text-emerald-700">
                        页面编辑内容会保存在当前浏览器中，不会直接修改
                        <code> src/data/resume.ts </code>
                        里的默认数据。
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRestoreDefault}
                      icon={<RotateCcw className="size-4" />}
                    >
                      恢复默认简历
                    </Button>
                  </div>
                </Container>
              </section>
            ) : null}

            <ResumeDocument
              resume={activeResume}
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

export default App;
