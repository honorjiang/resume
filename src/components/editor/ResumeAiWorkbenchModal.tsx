import {
  AlertCircle,
  Archive,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ClipboardCheck,
  Copy,
  GitCompareArrows,
  Layers3,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ResumeProfile } from '../../types/resume';
import type { ResumeImportAiConfig, ResumeImportProvider } from '../../types/resume-import';
import type {
  ResumeAtsReport,
  ResumeAtsRiskLevel,
  ResumeOptimizationPatch,
  ResumeOptimizationResult,
} from '../../types/resume-ai';
import type {
  AtsChecklistItem,
  ResumeInterviewPrompt,
  ResumeMaterialItem,
  ResumeVersion,
} from '../../types/resume-workbench';
import { useToast } from '../ui/Toast';
import { isAbortError } from '../../lib/ai/aiRequest';
import { ApiKeyWarning } from '../ui/ApiKeyWarning';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useLanguageMode } from '../../hooks/useLanguageMode';
import type { UIDictKey } from '../../lib/i18n/uiDict';

type ResumeAiWorkbenchModalProps = {
  isOpen: boolean;
  config: ResumeImportAiConfig;
  resume: ResumeProfile;
  resumeFingerprint: string;
  resumeVersions: ResumeVersion[];
  onClose: () => void;
  onConfigChange: (patch: Partial<ResumeImportAiConfig>) => void;
  onTestConnection: () => Promise<{ ok: boolean; message: string }>;
  onRunAtsCheck: (params: {
    targetRole?: string;
    jobDescription?: string;
  }) => Promise<ResumeAtsReport>;
  onRunJobOptimization: (params: {
    targetRole: string;
    jobDescription?: string;
  }) => Promise<ResumeOptimizationResult>;
  onApplyOptimization: (
    result: ResumeOptimizationResult,
    meta?: {
      jobDescription?: string;
      atsScore?: number;
      versionName?: string;
    },
  ) => void;
  onApplyVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onExtractMaterials: () => Promise<ResumeMaterialItem[]>;
  onExtractInterviewPrompts: () => Promise<ResumeInterviewPrompt[]>;
  /** Cancel in-progress AI call; actionKey matches App runWithAbort registration */
  onAbortAiAction: (actionKey: string) => void;
  onClearApiKey: () => void;
};

type WorkbenchTab = 'config' | 'versions' | 'evidence' | 'interview' | 'ats';

type AiRunMeta = {
  generatedAt: string;
  snapshot: string;
  emptyMessage?: string;
};

type ConnectionState =
  | { status: 'idle'; message: string }
  | { status: 'testing'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

const WORKBENCH_TAB_IDS: WorkbenchTab[] = ['config', 'versions', 'evidence', 'interview', 'ats'];

const PROVIDER_OPTIONS: Array<{
  value: ResumeImportProvider;
  label: string;
}> = [
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
  { value: 'anthropic-compatible', label: 'Anthropic Compatible' },
];

function providerHelpText(provider: ResumeImportProvider) {
  switch (provider) {
    case 'anthropic-compatible':
      return 'Claude / Anthropic-compatible gateway, text-only structured responses.';
    case 'openai-compatible':
      return '';
    default:
      return 'Native Responses API, suitable for OpenAI direct access.';
  }
}

function severityClass(severity: ResumeAtsRiskLevel) {
  switch (severity) {
    case 'high':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'low':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function patchKey(patch: ResumeOptimizationPatch) {
  return `${patch.path}::${patch.suggestedValue}`;
}

function evidenceLevelFromScore(score: number): ResumeAtsRiskLevel {
  if (score >= 75) {
    return 'low';
  }

  if (score >= 45) {
    return 'medium';
  }

  return 'high';
}

function inferSection(sectionText: string) {
  const source = sectionText.toLowerCase();

  if (/skill|技能|能力|关键词/.test(source)) {
    return { sectionId: 'skills', sectionLabel: '技能矩阵' };
  }
  if (/experience|经历|工作|公司|achievement|成果/.test(source)) {
    return { sectionId: 'experience', sectionLabel: '工作经历' };
  }
  if (/education|教育|学历|学校/.test(source)) {
    return { sectionId: 'education', sectionLabel: '教育背景' };
  }
  if (/certificate|证书|荣誉/.test(source)) {
    return { sectionId: 'certificates', sectionLabel: '证书荣誉' };
  }
  if (/contact|联系/.test(source)) {
    return { sectionId: 'contact', sectionLabel: '联系信息' };
  }

  return { sectionId: 'hero', sectionLabel: '首页摘要' };
}

function buildAtsChecklist(
  report: ResumeAtsReport | null,
  t: (key: UIDictKey) => string,
  sectionLabelMap: Record<string, string>,
): AtsChecklistItem[] {
  if (!report) {
    return [];
  }

  const riskItems = report.risks.map((risk, index) => {
    const section = inferSection(`${risk.section} ${risk.title} ${risk.detail}`);
    return {
      id: `risk-${index}-${risk.title}`,
      title: risk.title,
      detail: risk.detail,
      severity: risk.severity,
      sectionLabel: sectionLabelMap[section.sectionLabel] || section.sectionLabel,
      sectionId: section.sectionId,
      source: 'risk' as const,
    };
  });

  const suggestionItems = report.suggestions.map((suggestion, index) => {
    const section = inferSection(`${suggestion.title} ${suggestion.detail}`);
    return {
      id: `suggestion-${index}-${suggestion.title}`,
      title: suggestion.title,
      detail: suggestion.detail,
      severity: suggestion.priority,
      sectionLabel: sectionLabelMap[section.sectionLabel] || section.sectionLabel,
      sectionId: section.sectionId,
      source: 'suggestion' as const,
    };
  });

  const keywordItems = report.missingKeywords.map((keyword, index) => ({
    id: `keyword-${index}-${keyword}`,
    title: t('ai.supplementKeywordPrefix') + keyword,
    detail: t('ai.supplementKeywordDetail'),
    severity: 'medium' as const,
    sectionLabel: sectionLabelMap['技能矩阵'] || '技能矩阵',
    sectionId: 'skills',
    source: 'keyword' as const,
  }));

  return [...riskItems, ...suggestionItems, ...keywordItems];
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function versionDateLabel(value: string, locale: string) {
  try {
    return new Date(value).toLocaleString(locale, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function runTimeLabel(value: string, locale: string) {
  try {
    return new Date(value).toLocaleString(locale, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function panelVisibility(activeTab: WorkbenchTab, tab: WorkbenchTab) {
  return activeTab === tab ? 'block' : 'hidden lg:block';
}

function getRunStatus({
  hasApiKey,
  isRunning,
  meta,
  hasData,
  resumeFingerprint,
  emptyLabel,
  t,
  locale,
}: {
  hasApiKey: boolean;
  isRunning: boolean;
  meta?: AiRunMeta;
  hasData: boolean;
  resumeFingerprint: string;
  emptyLabel: string;
  t: (key: UIDictKey) => string;
  locale: string;
}) {
  if (!hasApiKey) {
    return {
      tone: 'border-slate-200 bg-slate-50 text-slate-500',
      label: t('ai.statusKeyMissing'),
      detail: t('ai.statusKeyMissingDetail'),
    };
  }

  if (isRunning) {
    return {
      tone: 'border-sky-200 bg-sky-50 text-sky-700',
      label: t('ai.statusRunning'),
      detail: t('ai.statusRunningDetail'),
    };
  }

  if (!meta) {
    return {
      tone: 'border-slate-200 bg-slate-50 text-slate-500',
      label: t('ai.statusPending'),
      detail: t('ai.statusPendingDetail'),
    };
  }

  if (meta.snapshot !== resumeFingerprint) {
    return {
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      label: t('ai.statusStale'),
      detail: t('ai.statusStaleDetail').replace('{time}', runTimeLabel(meta.generatedAt, locale)),
    };
  }

  if (!hasData) {
    return {
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      label: t('ai.statusEmpty'),
      detail: meta.emptyMessage || emptyLabel,
    };
  }

  return {
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    label: t('ai.statusDone'),
    detail: t('ai.statusDoneDetail').replace('{time}', runTimeLabel(meta.generatedAt, locale)),
  };
}

function getValueAtPath(source: unknown, path: string) {
  const value = path.split('.').reduce<unknown>((cursor, segment) => {
    if (Array.isArray(cursor)) {
      const index = Number(segment);
      return Number.isInteger(index) ? cursor[index] : undefined;
    }

    if (cursor && typeof cursor === 'object') {
      return (cursor as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);

  return typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
}

function sharedKeywords(left: string[], right: string[]) {
  const current = new Set(left);
  return right.filter((keyword) => current.has(keyword));
}

function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(value);
  }
}

function StatusPill({
  label,
  detail,
  tone,
}: {
  label: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className={['rounded-2xl border px-3 py-2 text-xs', tone].join(' ')}>
      <p className="font-semibold">{label}</p>
      <p className="mt-1 leading-5 opacity-80">{detail}</p>
    </div>
  );
}

export function ResumeAiWorkbenchModal({
  isOpen,
  config,
  resume,
  resumeFingerprint,
  resumeVersions,
  onClose,
  onConfigChange,
  onTestConnection,
  onRunAtsCheck,
  onRunJobOptimization,
  onApplyOptimization,
  onApplyVersion,
  onDeleteVersion,
  onExtractMaterials,
  onExtractInterviewPrompts,
  onAbortAiAction,
  onClearApiKey,
}: ResumeAiWorkbenchModalProps) {
  const toast = useToast();
  const { t, mode } = useLanguageMode();
  const locale = mode === 'zh' ? 'zh-CN' : mode === 'en' ? 'en-US' : mode;

  const tabLabels = useMemo<Record<WorkbenchTab, string>>(
    () => ({
      config: t('ai.tabConfig'),
      versions: t('ai.tabVersions'),
      evidence: t('ai.tabEvidence'),
      interview: t('ai.tabInterview'),
      ats: t('ai.tabAts'),
    }),
    [t],
  );

  const sectionLabelMap = useMemo<Record<string, string>>(
    () => ({
      '技能矩阵': t('section.skills'),
      '工作经历': t('section.experience'),
      '教育背景': t('section.education'),
      '证书荣誉': t('section.certificates'),
      '联系信息': t('section.contact'),
      '首页摘要': t('section.hero'),
    }),
    [t],
  );

  const severityLabels = useMemo<Record<ResumeAtsRiskLevel, string>>(
    () => ({
      high: t('ai.severityHigh'),
      medium: t('ai.severityMedium'),
      low: t('ai.severityLow'),
    }),
    [t],
  );

  const listSeparator = mode === 'zh' ? '、' : ', ';

  const [activeTab, setActiveTab] = useState<WorkbenchTab>('config');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [atsReport, setAtsReport] = useState<ResumeAtsReport | null>(null);
  const [optimizationResult, setOptimizationResult] =
    useState<ResumeOptimizationResult | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [acceptedPatchKeys, setAcceptedPatchKeys] = useState<string[]>([]);
  const [completedChecklistIds, setCompletedChecklistIds] = useState<string[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'idle',
    message: '',
  });
  const [isCheckingAts, setIsCheckingAts] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isExtractingMaterials, setIsExtractingMaterials] = useState(false);
  const [isExtractingInterview, setIsExtractingInterview] = useState(false);
  const [materials, setMaterials] = useState<ResumeMaterialItem[]>([]);
  const [interviewPrompts, setInterviewPrompts] = useState<ResumeInterviewPrompt[]>([]);
  const [atsMeta, setAtsMeta] = useState<AiRunMeta | undefined>();
  const [optimizationMeta, setOptimizationMeta] = useState<AiRunMeta | undefined>();
  const [materialsMeta, setMaterialsMeta] = useState<AiRunMeta | undefined>();
  const [interviewMeta, setInterviewMeta] = useState<AiRunMeta | undefined>();

  const isBusy =
    isCheckingAts ||
    isOptimizing ||
    isApplying ||
    isExtractingMaterials ||
    isExtractingInterview;
  const checklistItems = useMemo(
    () => buildAtsChecklist(atsReport, t, sectionLabelMap),
    [atsReport, t, sectionLabelMap],
  );
  const selectedPatches = useMemo(
    () =>
      optimizationResult?.patches.filter((patch) =>
        acceptedPatchKeys.includes(patchKey(patch)),
      ) ?? [],
    [acceptedPatchKeys, optimizationResult],
  );
  const strongMaterials = materials.filter((item) => item.evidenceLevel === 'low');
  const mediumMaterials = materials.filter((item) => item.evidenceLevel === 'medium');
  const weakMaterials = materials.filter((item) => item.evidenceLevel === 'high');
  const hasApiKey = Boolean(config.apiKey.trim());
  const selectedVersion = selectedVersionId
    ? resumeVersions.find((version) => version.id === selectedVersionId) ?? null
    : resumeVersions[0] ?? null;
  const versionSharedKeywords = selectedVersion
    ? sharedKeywords(
        optimizationResult?.keywordCoverage ?? [],
        selectedVersion.keywordCoverage,
      )
    : [];
  const atsStatus = getRunStatus({
    hasApiKey,
    isRunning: isCheckingAts,
    meta: atsMeta,
    hasData: Boolean(atsReport),
    resumeFingerprint,
    emptyLabel: t('ai.jobDescriptionEmpty'),
    t,
    locale,
  });
  const optimizationStatus = getRunStatus({
    hasApiKey,
    isRunning: isOptimizing,
    meta: optimizationMeta,
    hasData: Boolean(optimizationResult?.patches.length),
    resumeFingerprint,
    emptyLabel: t('ai.jobOptimizationEmpty'),
    t,
    locale,
  });
  const materialsStatus = getRunStatus({
    hasApiKey,
    isRunning: isExtractingMaterials,
    meta: materialsMeta,
    hasData: Boolean(materials.length),
    resumeFingerprint,
    emptyLabel: t('ai.materialsEmpty'),
    t,
    locale,
  });
  const interviewStatus = getRunStatus({
    hasApiKey,
    isRunning: isExtractingInterview,
    meta: interviewMeta,
    hasData: Boolean(interviewPrompts.length),
    resumeFingerprint,
    emptyLabel: t('ai.interviewEmpty'),
    t,
    locale,
  });

  // Update idle connection message when language changes
  const idleMessage = t('ai.connectionNotTested');
  if (connectionState.status === 'idle' && connectionState.message !== idleMessage) {
    setConnectionState({ status: 'idle', message: idleMessage });
  }

  async function handleTestConnection() {
    if (!hasApiKey) {
      setConnectionState({
        status: 'error',
        message: t('ai.keyRequired'),
      });
      return;
    }

    try {
      setConnectionState({
        status: 'testing',
        message: t('ai.testingConnection'),
      });
      const result = await onTestConnection();
      setConnectionState({
        status: result.ok ? 'success' : 'error',
        message: result.message,
      });
    } catch (error) {
      setConnectionState({
        status: 'error',
        message: error instanceof Error ? error.message : t('ai.connectionTestFailed'),
      });
    }
  }

  async function handleAtsCheck() {
    if (!hasApiKey) {
      toast.warning(t('ai.setKeyFirst'));
      return;
    }

    try {
      setIsCheckingAts(true);
      const nextReport = await onRunAtsCheck({
        targetRole: targetRole.trim() || undefined,
        jobDescription: jobDescription.trim() || undefined,
      });
      setAtsReport(nextReport);
      setAtsMeta({
        generatedAt: new Date().toISOString(),
        snapshot: resumeFingerprint,
      });
      setCompletedChecklistIds([]);
    } catch (error) {
      if (isAbortError(error)) return;
      toast.error(t('ai.atsFailed'), error instanceof Error ? error.message : t('ai.retryLater'));
    } finally {
      setIsCheckingAts(false);
    }
  }

  async function handleExtractMaterials() {
    if (!hasApiKey) {
      toast.warning(t('ai.setKeyFirstExtract'));
      return;
    }

    try {
      setIsExtractingMaterials(true);
      const result = await onExtractMaterials();
      setMaterials(result);
      setMaterialsMeta({
        generatedAt: new Date().toISOString(),
        snapshot: resumeFingerprint,
        emptyMessage: result.length
          ? undefined
          : t('ai.insufficientMaterials'),
      });
      toast.success(
        result.length
          ? t('ai.extractedCount').replace('{n}', String(result.length))
          : t('ai.noExtracted'),
        result.length ? undefined : t('ai.noExtractedDetail'),
      );
    } catch (error) {
      if (isAbortError(error)) return;
      toast.error(t('ai.extractFailed'), error instanceof Error ? error.message : t('ai.retryLater'));
    } finally {
      setIsExtractingMaterials(false);
    }
  }

  async function handleExtractInterviewPrompts() {
    if (!hasApiKey) {
      toast.warning(t('ai.setKeyFirstInterview'));
      return;
    }

    try {
      setIsExtractingInterview(true);
      const result = await onExtractInterviewPrompts();
      setInterviewPrompts(result);
      setInterviewMeta({
        generatedAt: new Date().toISOString(),
        snapshot: resumeFingerprint,
        emptyMessage: result.length
          ? undefined
          : t('ai.noInterviewStatements'),
      });
      toast.success(
        result.length
          ? t('ai.interviewGeneratedCount').replace('{n}', String(result.length))
          : t('ai.noInterviewGenerated'),
        result.length ? undefined : t('ai.noInterviewGeneratedDetail'),
      );
    } catch (error) {
      if (isAbortError(error)) return;
      toast.error(t('ai.interviewGenerateFailed'), error instanceof Error ? error.message : t('ai.retryLater'));
    } finally {
      setIsExtractingInterview(false);
    }
  }

  async function handleOptimization() {
    if (!hasApiKey) {
      toast.warning(t('ai.setKeyFirstOptimize'));
      return;
    }

    if (!targetRole.trim()) {
      toast.warning(t('ai.setKeyFirstOptimizeTarget'));
      return;
    }

    try {
      setIsOptimizing(true);
      const nextResult = await onRunJobOptimization({
        targetRole: targetRole.trim(),
        jobDescription: jobDescription.trim() || undefined,
      });
      setOptimizationResult(nextResult);
      setAcceptedPatchKeys(nextResult.patches.map(patchKey));
      setOptimizationMeta({
        generatedAt: new Date().toISOString(),
        snapshot: resumeFingerprint,
        emptyMessage: nextResult.patches.length
          ? undefined
          : t('ai.noWorthwhileRewrites'),
      });
    } catch (error) {
      if (isAbortError(error)) return;
      toast.error(t('ai.optimizeFailed'), error instanceof Error ? error.message : t('ai.retryLater'));
    } finally {
      setIsOptimizing(false);
    }
  }

  function handleApplyOptimization() {
    if (!optimizationResult || !selectedPatches.length) {
      toast.warning(t('ai.acceptOnePatch'));
      return;
    }

    setIsApplying(true);
    try {
      const acceptedResult: ResumeOptimizationResult = {
        ...optimizationResult,
        patches: selectedPatches,
      };

      onApplyOptimization(acceptedResult, {
        jobDescription,
        atsScore: atsReport?.overallScore,
      });
      toast.success(t('ai.appliedOptimization').replace('{n}', String(selectedPatches.length)));
      window.setTimeout(() => {
        onClose();
      }, 220);
    } finally {
      setIsApplying(false);
    }
  }

  function togglePatch(patch: ResumeOptimizationPatch) {
    const key = patchKey(patch);
    setAcceptedPatchKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function toggleChecklistItem(id: string) {
    setCompletedChecklistIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('nav.aiAssistant')}
      description={t('ai.modalDescription')}
    >
      <div className="flex max-h-[92vh] flex-col">
        <div className="border-b border-[var(--line)] px-6 py-4 pr-16">
          <p className="text-base font-semibold text-slate-950">{t('ai.title')}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t('ai.description')}
          </p>
        </div>

        {!config.apiKey.trim() ? (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{t('ai.apiKeyMissing')}</span>
            </div>
          </div>
        ) : (
          <div className="border-b border-amber-200 px-6 py-3">
            <ApiKeyWarning onClear={onClearApiKey} />
          </div>
        )}

        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {WORKBENCH_TAB_IDS.map((tabId) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={[
                  'min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition',
                  activeTab === tabId
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600',
                ].join(' ')}
              >
                {tabLabels[tabId]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/80 px-6 py-6">
          <Card className={['bg-white', panelVisibility(activeTab, 'config')].join(' ')}>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {t('ai.provider')}
                </span>
                <select
                  value={config.provider}
                  onChange={(event) =>
                    onConfigChange({
                      provider: event.target.value as ResumeImportProvider,
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {t('ai.apiKey')}
                </span>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(event) => onConfigChange({ apiKey: event.target.value })}
                  placeholder="sk-..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {t('ai.model')}
                </span>
                <input
                  type="text"
                  value={config.model}
                  onChange={(event) => onConfigChange({ model: event.target.value })}
                  placeholder="gpt-5 / MiniMax-M2.7"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {t('ai.baseUrl')}
                </span>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(event) => onConfigChange({ baseUrl: event.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>
            </div>

            {providerHelpText(config.provider) ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {providerHelpText(config.provider)}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="size-4 text-slate-500" />
                  {t('ai.privacyTitle')}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t('ai.privacyDetail')}
                </p>
                <p
                  className={[
                    'mt-2 text-xs font-medium',
                    connectionState.status === 'success'
                      ? 'text-emerald-700'
                      : connectionState.status === 'error'
                        ? 'text-rose-700'
                        : 'text-slate-500',
                  ].join(' ')}
                >
                  {connectionState.message}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void handleTestConnection();
                }}
                disabled={isBusy || !hasApiKey || connectionState.status === 'testing'}
                icon={
                  connectionState.status === 'testing' ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )
                }
              >
                {connectionState.status === 'testing' ? t('ai.testing') : t('ai.testConnection')}
              </Button>
            </div>
          </Card>

          <Card className={['bg-white', panelVisibility(activeTab, 'versions')].join(' ')}>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {t('ai.targetRole')}
                </span>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder={t('ai.targetRolePlaceholder')}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {t('ai.jobDescription')}
                </span>
                <textarea
                  value={jobDescription}
                  rows={5}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder={t('ai.jobDescriptionPlaceholder')}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant={isCheckingAts ? 'ghost' : 'secondary'}
                size="sm"
                onClick={() => {
                  if (isCheckingAts) {
                    onAbortAiAction('ats-check');
                    return;
                  }
                  void handleAtsCheck();
                }}
                disabled={(isBusy && !isCheckingAts) || (!isCheckingAts && !hasApiKey)}
                icon={
                  isCheckingAts ? (
                    <X className="size-4" />
                  ) : (
                    <ScanSearch className="size-4" />
                  )
                }
              >
                {isCheckingAts ? t('ai.cancelCheck') : t('ai.atsCheck')}
              </Button>
              <Button
                variant={isOptimizing ? 'ghost' : 'primary'}
                size="sm"
                onClick={() => {
                  if (isOptimizing) {
                    onAbortAiAction('job-optimization');
                    return;
                  }
                  void handleOptimization();
                }}
                disabled={(isBusy && !isOptimizing) || (!isOptimizing && !hasApiKey)}
                icon={
                  isOptimizing ? (
                    <X className="size-4" />
                  ) : (
                    <BriefcaseBusiness className="size-4" />
                  )
                }
              >
                {isOptimizing ? t('ai.cancelOptimization') : t('ai.generateRoleVersion')}
              </Button>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <StatusPill {...atsStatus} />
              <StatusPill {...optimizationStatus} />
            </div>
          </Card>

          <Card className={['bg-white', panelVisibility(activeTab, 'versions')].join(' ')}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <Layers3 className="size-4" />
                  <span>{t('ai.versionManager')}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t('ai.versionManagerDescription')}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                  {t('ai.versions')}
                </p>
                <p className="mt-1 text-2xl font-semibold">{resumeVersions.length}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {resumeVersions.map((version) => (
                <div
                  key={version.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">
                        {version.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {versionDateLabel(version.createdAt, locale)}
                        {version.atsScore ? ` · ATS ${version.atsScore}` : ''}
                        {version.patches.length
                          ? ` · ${t('ai.fieldChanges').replace('{n}', String(version.patches.length))}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={selectedVersion?.id === version.id ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setSelectedVersionId(version.id)}
                        icon={<GitCompareArrows className="size-4" />}
                      >
                        {t('ai.compare')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onApplyVersion(version.id)}
                        icon={<Archive className="size-4" />}
                      >
                        {t('ai.applyVersion')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteVersion(version.id)}
                        className="text-rose-600 hover:text-rose-700"
                        icon={<Trash2 className="size-4" />}
                      >
                        {t('ai.deleteVersion')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {!resumeVersions.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  {t('ai.noVersions')}
                </div>
              ) : null}
            </div>

            {selectedVersion ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      <GitCompareArrows className="size-4" />
                      <span>{t('ai.versionCompare')}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      {selectedVersion.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {t('ai.fieldChanges').replace('{n}', String(selectedVersion.patches.length))}
                      {selectedVersion.keywordCoverage.length
                        ? ` · ${t('ai.enhancedKeywords').replace('{n}', String(selectedVersion.keywordCoverage.length))}`
                        : ''}
                    </p>
                  </div>
                  {versionSharedKeywords.length ? (
                    <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      {t('ai.sharedKeywords')}:{' '}{versionSharedKeywords.join(listSeparator)}
                    </div>
                  ) : null}
                </div>

                {selectedVersion.keywordCoverage.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedVersion.keywordCoverage.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3">
                  {selectedVersion.patches.slice(0, 8).map((patch) => (
                    <div
                      key={patchKey(patch)}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {patch.label}
                        </p>
                        <code className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">
                          {patch.path}
                        </code>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs font-semibold text-slate-400">
                            {t('ai.currentResume')}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {getValueAtPath(resume, patch.path) || t('ai.currentEmpty')}
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-white p-3">
                          <p className="text-xs font-semibold text-slate-400">
                            {t('ai.thisVersion')}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-900">
                            {getValueAtPath(selectedVersion.resume, patch.path) ||
                              patch.suggestedValue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!selectedVersion.patches.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      {t('ai.noVersionPatches')}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>

          {optimizationResult ? (
            <Card className={['bg-white', panelVisibility(activeTab, 'versions')].join(' ')}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                    <Sparkles className="size-4" />
                    <span>{t('ai.aiDiffTitle')}</span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    {t('ai.targetRoleLabel')}:{' '}{optimizationResult.targetRole || targetRole}
                  </p>
                  {optimizationResult.summary ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {optimizationResult.summary}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setAcceptedPatchKeys(optimizationResult.patches.map(patchKey))
                    }
                  >
                    {t('ai.selectAll')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAcceptedPatchKeys([])}
                  >
                    {t('ai.rejectAll')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedPatches.length || isApplying}
                    onClick={handleApplyOptimization}
                    icon={<Check className="size-4" />}
                  >
                    {isApplying
                      ? t('ai.applying')
                      : t('ai.applyOptimization').replace('{n}', String(selectedPatches.length))}
                  </Button>
                </div>
              </div>

              {optimizationResult.keywordCoverage.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {optimizationResult.keywordCoverage.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                {optimizationResult.patches.map((patch) => {
                  const accepted = acceptedPatchKeys.includes(patchKey(patch));

                  return (
                    <div
                      key={patchKey(patch)}
                      className={[
                        'rounded-2xl border p-4',
                        accepted
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-slate-200 bg-slate-50/80',
                      ].join(' ')}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {patch.label}
                            </p>
                            <code className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">
                              {patch.path}
                            </code>
                          </div>
                          <p className="mt-2 text-xs leading-6 text-slate-500">
                            {patch.reason}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={accepted ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => togglePatch(patch)}
                          icon={
                            accepted ? (
                              <Check className="size-4" />
                            ) : (
                              <X className="size-4" />
                            )
                          }
                        >
                          {accepted ? t('ai.accepted') : t('ai.rejected')}
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            {t('ai.currentValue')}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {patch.currentValue}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-sky-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            {t('ai.suggestedValue')}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-900">
                            {patch.suggestedValue}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <Card className={['bg-white', panelVisibility(activeTab, 'evidence')].join(' ')}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <BarChart3 className="size-4" />
                  <span>{t('ai.evidenceTitle')}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t('ai.evidenceDescription')}
                </p>
              </div>
              <Button
                variant={isExtractingMaterials ? 'ghost' : 'secondary'}
                size="sm"
                onClick={() => {
                  if (isExtractingMaterials) {
                    onAbortAiAction('extract-materials');
                    return;
                  }
                  void handleExtractMaterials();
                }}
                disabled={
                  (isBusy && !isExtractingMaterials) ||
                  (!isExtractingMaterials && !hasApiKey)
                }
                icon={
                  isExtractingMaterials ? (
                    <X className="size-4" />
                  ) : (
                    <Target className="size-4" />
                  )
                }
              >
                {isExtractingMaterials
                  ? t('ai.cancelExtract')
                  : materials.length
                    ? t('ai.reextractEvidence')
                    : t('ai.extractEvidence')}
              </Button>
            </div>

            <div className="mt-5">
              <StatusPill {...materialsStatus} />
            </div>

            {materials.length ? (
              <>
                <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-400">{t('ai.itemsLabel')}</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-950">
                      {materials.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                    <p className="text-[11px] text-emerald-600">{t('ai.strongLabel')}</p>
                    <p className="mt-0.5 text-lg font-semibold text-emerald-700">
                      {strongMaterials.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-3 py-2">
                    <p className="text-[11px] text-amber-600">{t('ai.usableLabel')}</p>
                    <p className="mt-0.5 text-lg font-semibold text-amber-700">
                      {mediumMaterials.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-2">
                    <p className="text-[11px] text-rose-600">{t('ai.weakLabel')}</p>
                    <p className="mt-0.5 text-lg font-semibold text-rose-700">
                      {weakMaterials.length}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {materials.slice(0, 12).map((item) => {
                    const evidence = item.evidence;
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={[
                              'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                              severityClass(item.evidenceLevel),
                            ].join(' ')}
                          >
                            {evidence.score} {t('ai.scoreUnit')}
                          </span>
                          <span className="text-xs text-slate-400">
                            {item.sourceLabel}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.content}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            [t('ai.dimensionMetric'), evidence.hasMetric],
                            [t('ai.dimensionContext'), evidence.hasContext],
                            [t('ai.dimensionAction'), evidence.hasAction],
                            [t('ai.dimensionResult'), evidence.hasResult],
                          ].map(([label, passed]) => (
                            <span
                              key={String(label)}
                              className={[
                                'rounded-full px-2.5 py-1 text-[11px] font-medium',
                                passed
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700',
                              ].join(' ')}
                            >
                              {passed ? '✓' : '×'} {label}
                            </span>
                          ))}
                        </div>
                        {evidence.missing.length ? (
                          <p className="mt-3 text-xs leading-5 text-rose-600">
                            {t('ai.missingDimension')}:{' '}{evidence.missing.join(listSeparator)}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => scrollToSection(inferSection(item.path).sectionId)}
                            icon={<MapPin className="size-4" />}
                          >
                            {t('ai.locate')}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyText(item.content)}
                            icon={<Copy className="size-4" />}
                          >
                            {t('ai.copy')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {t('ai.evidenceEmptyMessage')}
              </div>
            )}
          </Card>

          <Card className={['bg-white', panelVisibility(activeTab, 'interview')].join(' ')}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <MessageSquareText className="size-4" />
                  <span>{t('ai.interviewTitle')}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t('ai.interviewDescription')}
                </p>
              </div>
              <Button
                variant={isExtractingInterview ? 'ghost' : 'secondary'}
                size="sm"
                onClick={() => {
                  if (isExtractingInterview) {
                    onAbortAiAction('extract-interview');
                    return;
                  }
                  void handleExtractInterviewPrompts();
                }}
                disabled={
                  (isBusy && !isExtractingInterview) ||
                  (!isExtractingInterview && !hasApiKey)
                }
                icon={
                  isExtractingInterview ? (
                    <X className="size-4" />
                  ) : (
                    <MessageSquareText className="size-4" />
                  )
                }
              >
                {isExtractingInterview
                  ? t('ai.cancelGenerateInterview')
                  : interviewPrompts.length
                    ? t('ai.regenerateInterview')
                    : t('ai.generateInterview')}
              </Button>
            </div>

            <div className="mt-5">
              <StatusPill {...interviewStatus} />
            </div>

            {interviewPrompts.length ? (
              <>
                <div className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-white">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                      {t('ai.questions')}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {interviewPrompts.reduce(
                        (sum, item) => sum + item.questions.length,
                        0,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {interviewPrompts.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                            severityClass(evidenceLevelFromScore(item.evidence.score)),
                          ].join(' ')}
                        >
                          {t('ai.evidenceScore')} {item.evidence.score}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.sourceLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {item.sourceText}
                      </p>
                      <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                        {item.questions.map((question) => (
                          <li key={question}>- {question}</li>
                        ))}
                      </ul>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            copyText(
                              [item.sourceText, '', ...item.questions.map((q) => `- ${q}`)].join(
                                '\n',
                              ),
                            )
                          }
                          icon={<Copy className="size-4" />}
                        >
                          {t('ai.copyQuestions')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => scrollToSection('experience')}
                          icon={<MapPin className="size-4" />}
                        >
                          {t('ai.locateExperience')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {t('ai.interviewEmptyMessage')}
              </div>
            )}
          </Card>

          <Card className={['bg-white', panelVisibility(activeTab, 'ats')].join(' ')}>
            {atsReport ? (
              <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    <ClipboardCheck className="size-4" />
                    <span>{t('ai.atsTitle')}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {atsReport.summary || t('ai.atsGeneratedSummary')}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                    {t('ai.score')}
                  </p>
                  <p className="mt-1 text-3xl font-semibold">{atsReport.overallScore}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <StatusPill {...atsStatus} />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold">
                    {t('ai.completed')
                      .replace('{done}', String(completedChecklistIds.length))
                      .replace('{total}', String(checklistItems.length))}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('ai.completedDetail')}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t('ai.strengths')}</p>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                    {atsReport.strengths.map((strength) => (
                      <li key={strength}>- {strength}</li>
                    ))}
                    {!atsReport.strengths.length ? (
                      <li className="text-slate-400">{t('ai.noStrengths')}</li>
                    ) : null}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t('ai.missingKeywords')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {atsReport.missingKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                      >
                        {keyword}
                      </span>
                    ))}
                    {!atsReport.missingKeywords.length ? (
                      <span className="text-sm text-slate-400">{t('ai.noMissingKeywords')}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {checklistItems.map((item) => {
                  const completed = completedChecklistIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={[
                        'rounded-2xl border p-4',
                        completed
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : 'border-slate-200 bg-slate-50/80',
                      ].join(' ')}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleChecklistItem(item.id)}
                              className={[
                                'flex size-6 items-center justify-center rounded-full border text-xs transition',
                                completed
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-slate-300 bg-white text-transparent',
                              ].join(' ')}
                              aria-label={completed ? t('ai.markUndone') : t('ai.markDone')}
                            >
                              <Check className="size-3.5" />
                            </button>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.title}
                            </p>
                            <span
                              className={[
                                'rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                                severityClass(item.severity),
                              ].join(' ')}
                            >
                              {severityLabels[item.severity]}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {item.detail}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => scrollToSection(item.sectionId)}
                          icon={<MapPin className="size-4" />}
                        >
                          {item.sectionLabel}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <ClipboardCheck className="size-4" />
                  <span>{t('ai.atsTitle')}</span>
                </div>
                <div className="mt-5">
                  <StatusPill {...atsStatus} />
                </div>
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  {t('ai.atsEmptyMessage')}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </Modal>
  );
}
