import { AlertCircle, BriefcaseBusiness, LoaderCircle, ScanSearch, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { ResumeImportAiConfig, ResumeImportProvider } from '../../types/resume-import';
import type { ResumeAtsReport, ResumeOptimizationResult } from '../../types/resume-ai';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';

type ResumeAiWorkbenchModalProps = {
  isOpen: boolean;
  config: ResumeImportAiConfig;
  onClose: () => void;
  onConfigChange: (patch: Partial<ResumeImportAiConfig>) => void;
  onRunAtsCheck: (params: {
    targetRole?: string;
    jobDescription?: string;
  }) => Promise<ResumeAtsReport>;
  onRunJobOptimization: (params: {
    targetRole: string;
    jobDescription?: string;
  }) => Promise<ResumeOptimizationResult>;
  onApplyOptimization: (result: ResumeOptimizationResult) => void;
};

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

function severityClass(severity: 'high' | 'medium' | 'low') {
  switch (severity) {
    case 'high':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'low':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

export function ResumeAiWorkbenchModal({
  isOpen,
  config,
  onClose,
  onConfigChange,
  onRunAtsCheck,
  onRunJobOptimization,
  onApplyOptimization,
}: ResumeAiWorkbenchModalProps) {
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [atsReport, setAtsReport] = useState<ResumeAtsReport | null>(null);
  const [optimizationResult, setOptimizationResult] =
    useState<ResumeOptimizationResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCheckingAts, setIsCheckingAts] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const isBusy = isCheckingAts || isOptimizing || isApplying;

  async function handleAtsCheck() {
    try {
      setFeedback(null);
      setIsCheckingAts(true);
      const nextReport = await onRunAtsCheck({
        targetRole: targetRole.trim() || undefined,
        jobDescription: jobDescription.trim() || undefined,
      });
      setAtsReport(nextReport);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'ATS 检查失败，请重试。');
    } finally {
      setIsCheckingAts(false);
    }
  }

  async function handleOptimization() {
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
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '岗位定向优化失败，请重试。',
      );
    } finally {
      setIsOptimizing(false);
    }
  }

  function handleApplyOptimization() {
    if (!optimizationResult?.patches.length) {
      return;
    }

    setIsApplying(true);
    try {
      onApplyOptimization(optimizationResult);
      setOptimizationResult((current) =>
        current
          ? {
              ...current,
              patches: current.patches.map((patch) => ({
                ...patch,
                currentValue: patch.suggestedValue,
              })),
            }
          : current,
      );
      setFeedback(`已应用 ${optimizationResult.patches.length} 条优化建议，页面内容已更新。`);
      window.setTimeout(() => {
        onClose();
      }, 180);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI 助手"
      description="统一管理 AI 配置、ATS 检查和岗位定向优化。"
    >
      <div className="flex max-h-[92vh] flex-col">
        <div className="border-b border-[var(--line)] px-6 py-4 pr-16">
          <p className="text-base font-semibold text-slate-950">AI 助手</p>
          <p className="mt-1 text-sm text-slate-500">
            字段级润色和 STAR 改写会直接复用这里的模型配置。
          </p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/80 px-6 py-6">
          <Card className="bg-white">
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
          </Card>

          <Card className="bg-white">
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
                disabled={isBusy}
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
                disabled={isBusy}
                icon={
                  isOptimizing ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <BriefcaseBusiness className="size-4" />
                  )
                }
              >
                {isOptimizing ? '优化中...' : '岗位定向优化'}
              </Button>
            </div>
          </Card>

          {feedback ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {feedback}
            </div>
          ) : null}

          {optimizationResult ? (
            <Card className="bg-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                    <Sparkles className="size-4" />
                    <span>岗位定向优化结果</span>
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
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!optimizationResult.patches.length || isApplying}
                  onClick={handleApplyOptimization}
                >
                  {isApplying
                    ? '应用中...'
                    : `应用 ${optimizationResult.patches.length} 条建议`}
                </Button>
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
                {optimizationResult.patches.map((patch) => (
                  <div
                    key={`${patch.path}-${patch.suggestedValue}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{patch.label}</p>
                      <code className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">
                        {patch.path}
                      </code>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                      当前内容
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {patch.currentValue}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                      建议改写
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-900">
                      {patch.suggestedValue}
                    </p>
                    <p className="mt-3 text-xs leading-6 text-slate-500">{patch.reason}</p>
                  </div>
                ))}
              </div>

              {optimizationResult.warnings.length ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {optimizationResult.warnings.join(' ')}
                </div>
              ) : null}
            </Card>
          ) : null}

          {atsReport ? (
            <Card className="bg-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">ATS 检查结果</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
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

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">优势</p>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                    {atsReport.strengths.map((strength) => (
                      <li key={strength}>• {strength}</li>
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

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">主要风险</p>
                  <div className="mt-3 space-y-3">
                    {atsReport.risks.map((risk) => (
                      <div
                        key={`${risk.title}-${risk.section}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{risk.title}</p>
                          <span
                            className={[
                              'rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                              severityClass(risk.severity),
                            ].join(' ')}
                          >
                            {risk.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{risk.section}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{risk.detail}</p>
                      </div>
                    ))}
                    {!atsReport.risks.length ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-400">
                        暂无高风险项。
                      </div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">修改建议</p>
                  <div className="mt-3 space-y-3">
                    {atsReport.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.title}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {suggestion.title}
                          </p>
                          <span
                            className={[
                              'rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                              severityClass(suggestion.priority),
                            ].join(' ')}
                          >
                            {suggestion.priority}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {suggestion.detail}
                        </p>
                      </div>
                    ))}
                    {!atsReport.suggestions.length ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-400">
                        暂无具体修改建议。
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {!config.apiKey.trim() ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>请先填写可用的 API Key，再使用 AI 助手功能。</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
