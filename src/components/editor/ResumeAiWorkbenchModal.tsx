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
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';

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

const WORKBENCH_TABS: Array<{
  id: WorkbenchTab;
  label: string;
}> = [
  { id: 'config', label: '配置' },
  { id: 'versions', label: '版本' },
  { id: 'evidence', label: '证据' },
  { id: 'interview', label: '追问' },
  { id: 'ats', label: 'ATS' },
];

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

function buildAtsChecklist(report: ResumeAtsReport | null): AtsChecklistItem[] {
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
      sectionLabel: section.sectionLabel,
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
      sectionLabel: section.sectionLabel,
      sectionId: section.sectionId,
      source: 'suggestion' as const,
    };
  });

  const keywordItems = report.missingKeywords.map((keyword, index) => ({
    id: `keyword-${index}-${keyword}`,
    title: `补充关键词：${keyword}`,
    detail: '在摘要、技能或相关经历中自然补充该关键词。',
    severity: 'medium' as const,
    sectionLabel: '技能矩阵',
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

function versionDateLabel(value: string) {
  try {
    return new Date(value).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function runTimeLabel(value: string) {
  try {
    return new Date(value).toLocaleString('zh-CN', {
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
}: {
  hasApiKey: boolean;
  isRunning: boolean;
  meta?: AiRunMeta;
  hasData: boolean;
  resumeFingerprint: string;
  emptyLabel: string;
}) {
  if (!hasApiKey) {
    return {
      tone: 'border-slate-200 bg-slate-50 text-slate-500',
      label: '未配置 Key',
      detail: '填写 API Key 后才能运行。',
    };
  }

  if (isRunning) {
    return {
      tone: 'border-sky-200 bg-sky-50 text-sky-700',
      label: '运行中',
      detail: '正在调用 AI 实时分析当前简历。',
    };
  }

  if (!meta) {
    return {
      tone: 'border-slate-200 bg-slate-50 text-slate-500',
      label: '待运行',
      detail: '点击按钮后才会生成结果。',
    };
  }

  if (meta.snapshot !== resumeFingerprint) {
    return {
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      label: '已过期',
      detail: `结果生成于 ${runTimeLabel(meta.generatedAt)}，当前简历已变化。`,
    };
  }

  if (!hasData) {
    return {
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      label: '空结果',
      detail: meta.emptyMessage || emptyLabel,
    };
  }

  return {
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    label: '已生成',
    detail: `基于当前简历，生成于 ${runTimeLabel(meta.generatedAt)}。`,
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
}: ResumeAiWorkbenchModalProps) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('config');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [atsReport, setAtsReport] = useState<ResumeAtsReport | null>(null);
  const [optimizationResult, setOptimizationResult] =
    useState<ResumeOptimizationResult | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [acceptedPatchKeys, setAcceptedPatchKeys] = useState<string[]>([]);
  const [completedChecklistIds, setCompletedChecklistIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'idle',
    message: '尚未测试连接。',
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
  const checklistItems = useMemo(() => buildAtsChecklist(atsReport), [atsReport]);
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
    emptyLabel: 'AI 未返回 ATS 检查结果。',
  });
  const optimizationStatus = getRunStatus({
    hasApiKey,
    isRunning: isOptimizing,
    meta: optimizationMeta,
    hasData: Boolean(optimizationResult?.patches.length),
    resumeFingerprint,
    emptyLabel: 'AI 没有发现需要改写的字段。',
  });
  const materialsStatus = getRunStatus({
    hasApiKey,
    isRunning: isExtractingMaterials,
    meta: materialsMeta,
    hasData: Boolean(materials.length),
    resumeFingerprint,
    emptyLabel: 'AI 未从当前简历中提取到可评分素材。',
  });
  const interviewStatus = getRunStatus({
    hasApiKey,
    isRunning: isExtractingInterview,
    meta: interviewMeta,
    hasData: Boolean(interviewPrompts.length),
    resumeFingerprint,
    emptyLabel: 'AI 未从当前简历中找到适合追问的经历。',
  });

  async function handleTestConnection() {
    if (!hasApiKey) {
      setConnectionState({
        status: 'error',
        message: '请先填写 API Key。',
      });
      return;
    }

    try {
      setFeedback(null);
      setConnectionState({
        status: 'testing',
        message: '正在测试模型连接...',
      });
      const result = await onTestConnection();
      setConnectionState({
        status: result.ok ? 'success' : 'error',
        message: result.message,
      });
    } catch (error) {
      setConnectionState({
        status: 'error',
        message: error instanceof Error ? error.message : '连接测试失败，请检查配置。',
      });
    }
  }

  async function handleAtsCheck() {
    if (!hasApiKey) {
      setFeedback('请先填写 API Key，再运行 ATS 检查。');
      return;
    }

    try {
      setFeedback(null);
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
      setFeedback(error instanceof Error ? error.message : 'ATS 检查失败，请重试。');
    } finally {
      setIsCheckingAts(false);
    }
  }

  async function handleExtractMaterials() {
    if (!hasApiKey) {
      setFeedback('请先填写 API Key，再提取证据强度评分。');
      return;
    }

    try {
      setFeedback(null);
      setIsExtractingMaterials(true);
      const result = await onExtractMaterials();
      setMaterials(result);
      setMaterialsMeta({
        generatedAt: new Date().toISOString(),
        snapshot: resumeFingerprint,
        emptyMessage: result.length
          ? undefined
          : '当前简历没有足够具体的成果、项目动作或亮点可供评分。',
      });
      setFeedback(
        result.length
          ? `AI 已提取 ${result.length} 条证据素材。`
          : 'AI 未提取到证据素材，请补充更具体的经历或项目成果后重试。',
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'AI 证据提取失败，请重试。');
    } finally {
      setIsExtractingMaterials(false);
    }
  }

  async function handleExtractInterviewPrompts() {
    if (!hasApiKey) {
      setFeedback('请先填写 API Key，再生成面试追问。');
      return;
    }

    try {
      setFeedback(null);
      setIsExtractingInterview(true);
      const result = await onExtractInterviewPrompts();
      setInterviewPrompts(result);
      setInterviewMeta({
        generatedAt: new Date().toISOString(),
        snapshot: resumeFingerprint,
        emptyMessage: result.length
          ? undefined
          : '当前简历没有足够明确的成果声明可生成追问。',
      });
      setFeedback(
        result.length
          ? `AI 已生成 ${result.length} 组面试追问。`
          : 'AI 未生成面试追问，请补充更明确的成果、数据或项目描述后重试。',
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'AI 面试追问生成失败，请重试。');
    } finally {
      setIsExtractingInterview(false);
    }
  }

  async function handleOptimization() {
    if (!hasApiKey) {
      setFeedback('请先填写 API Key，再生成岗位版本。');
      return;
    }

    if (!targetRole.trim()) {
      setFeedback('请先填写目标岗位，再运行岗位定向优化。');
      return;
    }

    try {
      setFeedback(null);
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
          : 'AI 没有发现值得应用的岗位定向改写。',
      });
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '岗位定向优化失败，请重试。',
      );
    } finally {
      setIsOptimizing(false);
    }
  }

  function handleApplyOptimization() {
    if (!optimizationResult || !selectedPatches.length) {
      setFeedback('请至少接受一条优化建议。');
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
      setFeedback(`已应用 ${selectedPatches.length} 条建议，并保存为岗位版本。`);
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
      title="AI 助手"
      description="统一管理 AI 配置、ATS 检查、岗位版本和素材库。"
    >
      <div className="flex max-h-[92vh] flex-col">
        <div className="border-b border-[var(--line)] px-6 py-4 pr-16">
          <p className="text-base font-semibold text-slate-950">AI 简历工作台</p>
          <p className="mt-1 text-sm text-slate-500">
            生成岗位版本、审核 AI 改动、检查证据强度，并模拟面试追问。
          </p>
        </div>

        {!config.apiKey.trim() ? (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>请先填写 API Key；AI 模块会在点击按钮后实时分析当前简历。</span>
            </div>
          </div>
        ) : null}

        {feedback ? (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-800">
            {feedback}
          </div>
        ) : null}

        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {WORKBENCH_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition',
                  activeTab === tab.id
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/80 px-6 py-6">
          <Card className={['bg-white', panelVisibility(activeTab, 'config')].join(' ')}>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Provider
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
                  API Key
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
                  Model
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
                  Base URL
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
                  AI 配置与隐私
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  点击测试连接只验证模型是否能返回结构化 JSON；点击 ATS、提取评分、生成追问或岗位版本时，才会把当前简历内容发送到你配置的模型服务。
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
                {connectionState.status === 'testing' ? '测试中...' : '测试连接'}
              </Button>
            </div>
          </Card>

          <Card className={['bg-white', panelVisibility(activeTab, 'versions')].join(' ')}>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  目标岗位
                </span>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="例如：数据分析师 / 前端开发 / 产品经理"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  岗位描述 / 关键词
                </span>
                <textarea
                  value={jobDescription}
                  rows={5}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="粘贴 JD、关键要求、核心技能、业务场景。"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void handleAtsCheck();
                }}
                disabled={isBusy || !hasApiKey}
                icon={
                  isCheckingAts ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <ScanSearch className="size-4" />
                  )
                }
              >
                {isCheckingAts ? '分析中...' : 'ATS 检查'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  void handleOptimization();
                }}
                disabled={isBusy || !hasApiKey}
                icon={
                  isOptimizing ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <BriefcaseBusiness className="size-4" />
                  )
                }
              >
                {isOptimizing ? '优化中...' : '生成岗位版本'}
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
                  <span>岗位版本管理</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  每次接受岗位优化后都会保存一个本地版本，投递追踪可绑定版本和反馈。
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                  Versions
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
                        {versionDateLabel(version.createdAt)}
                        {version.atsScore ? ` · ATS ${version.atsScore}` : ''}
                        {version.patches.length
                          ? ` · ${version.patches.length} 项改动`
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
                        对比
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onApplyVersion(version.id)}
                        icon={<Archive className="size-4" />}
                      >
                        应用版本
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteVersion(version.id)}
                        className="text-rose-600 hover:text-rose-700"
                        icon={<Trash2 className="size-4" />}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {!resumeVersions.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  暂无岗位版本。运行岗位优化并接受建议后会自动生成。
                </div>
              ) : null}
            </div>

            {selectedVersion ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      <GitCompareArrows className="size-4" />
                      <span>版本对比</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      {selectedVersion.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {selectedVersion.patches.length} 项字段改动
                      {selectedVersion.keywordCoverage.length
                        ? ` · ${selectedVersion.keywordCoverage.length} 个增强关键词`
                        : ''}
                    </p>
                  </div>
                  {versionSharedKeywords.length ? (
                    <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      与本次优化重合：{versionSharedKeywords.join('、')}
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
                            当前简历
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {getValueAtPath(resume, patch.path) || '当前为空'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-white p-3">
                          <p className="text-xs font-semibold text-slate-400">
                            该版本
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
                      该版本没有保存字段级改动。
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
                    <span>AI 修改前后对比</span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    目标岗位：{optimizationResult.targetRole || targetRole}
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
                    全选
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAcceptedPatchKeys([])}
                  >
                    全部拒绝
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedPatches.length || isApplying}
                    onClick={handleApplyOptimization}
                    icon={<Check className="size-4" />}
                  >
                    {isApplying
                      ? '应用中...'
                      : `应用 ${selectedPatches.length} 条并保存版本`}
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
                          {accepted ? '已接受' : '已拒绝'}
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            当前内容
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {patch.currentValue}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-sky-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            建议改写
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
                  <span>可信度 / 证据强度评分</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  点击后由 AI 从当前简历实时提取素材，并按数据、上下文、个人动作和结果四项评分。
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void handleExtractMaterials();
                }}
                disabled={isBusy || !hasApiKey}
                icon={
                  isExtractingMaterials ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Target className="size-4" />
                  )
                }
              >
                {isExtractingMaterials ? '提取中...' : materials.length ? 'AI 重新提取' : 'AI 提取评分'}
              </Button>
            </div>

            <div className="mt-5">
              <StatusPill {...materialsStatus} />
            </div>

            {materials.length ? (
              <>
                <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-400">素材</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-950">
                      {materials.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                    <p className="text-[11px] text-emerald-600">强证据</p>
                    <p className="mt-0.5 text-lg font-semibold text-emerald-700">
                      {strongMaterials.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-3 py-2">
                    <p className="text-[11px] text-amber-600">可用</p>
                    <p className="mt-0.5 text-lg font-semibold text-amber-700">
                      {mediumMaterials.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-2">
                    <p className="text-[11px] text-rose-600">待加强</p>
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
                            {evidence.score} 分
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
                            ['数据', evidence.hasMetric],
                            ['上下文', evidence.hasContext],
                            ['动作', evidence.hasAction],
                            ['结果', evidence.hasResult],
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
                            待补：{evidence.missing.join('、')}
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
                            定位
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyText(item.content)}
                            icon={<Copy className="size-4" />}
                          >
                            复制
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                填写 API Key 后点击“AI 提取评分”，这里才会显示 AI 分析结果。
              </div>
            )}
          </Card>

          <Card className={['bg-white', panelVisibility(activeTab, 'interview')].join(' ')}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <MessageSquareText className="size-4" />
                  <span>面试追问模拟</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  点击后由 AI 基于当前简历生成追问，优先暴露数据口径、业务背景、个人贡献和结果复用性。
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void handleExtractInterviewPrompts();
                }}
                disabled={isBusy || !hasApiKey}
                icon={
                  isExtractingInterview ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <MessageSquareText className="size-4" />
                  )
                }
              >
                {isExtractingInterview ? '生成中...' : interviewPrompts.length ? 'AI 重新生成' : 'AI 生成追问'}
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
                      Questions
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
                          证据 {item.evidence.score}
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
                          复制追问
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => scrollToSection('experience')}
                          icon={<MapPin className="size-4" />}
                        >
                          定位经历
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                填写 API Key 后点击“AI 生成追问”，这里才会显示 AI 面试追问。
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
                    <span>ATS 检查清单</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {atsReport.summary || '已生成 ATS 分析结果。'}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                    Score
                  </p>
                  <p className="mt-1 text-3xl font-semibold">{atsReport.overallScore}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <StatusPill {...atsStatus} />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold">
                    {completedChecklistIds.length}/{checklistItems.length} 已处理
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    可逐项标记完成并定位到简历区块。
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">优势</p>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                    {atsReport.strengths.map((strength) => (
                      <li key={strength}>- {strength}</li>
                    ))}
                    {!atsReport.strengths.length ? (
                      <li className="text-slate-400">暂无明显优势摘要。</li>
                    ) : null}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">缺失关键词</p>
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
                      <span className="text-sm text-slate-400">暂无明显缺失。</span>
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
                              aria-label={completed ? '标记未完成' : '标记完成'}
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
                              {item.severity}
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
                  <span>ATS 检查清单</span>
                </div>
                <div className="mt-5">
                  <StatusPill {...atsStatus} />
                </div>
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  填写 API Key 后点击“ATS 检查”，这里才会显示 AI 生成的检查清单。
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </Modal>
  );
}
