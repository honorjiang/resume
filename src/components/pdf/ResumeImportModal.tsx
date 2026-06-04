import {
  AlertCircle,
  CheckCircle2,
  FileInput,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react';
import { useRef } from 'react';
import { formatFileSize } from '../../lib/format';
import type {
  ResumeImportAiConfig,
  ResumeImportProvider,
  ResumeImportReview,
  ResumeImportStatus,
} from '../../types/resume-import';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';

type ResumeImportModalProps = {
  config: ResumeImportAiConfig;
  error: string | null;
  isOpen: boolean;
  review: ResumeImportReview | null;
  status: ResumeImportStatus;
  onApply: () => void;
  onClose: () => void;
  onConfigChange: (patch: Partial<ResumeImportAiConfig>) => void;
  onReset: () => void;
  onSelectFile: (file: File) => void;
};

const PROVIDER_OPTIONS: Array<{
  value: ResumeImportProvider;
  label: string;
  hint: string;
}> = [
  {
    value: 'openai-responses',
    label: 'OpenAI Responses',
    hint: '原生 Responses API，可直接发送 PDF 文件。',
  },
  {
    value: 'openai-compatible',
    label: 'OpenAI Compatible',
    hint: '',
  },
  {
    value: 'anthropic-compatible',
    label: 'Anthropic Compatible',
    hint: '适合 Claude-format / Anthropic 兼容网关，依赖本地提取文本。',
  },
];

function statusText(status: ResumeImportStatus) {
  switch (status) {
    case 'extracting':
      return '正在准备 PDF 文件与本地文本预览';
    case 'parsing':
      return '正在调用 AI 提取结构化简历';
    case 'ready':
      return '提取完成，请确认后应用到当前页面';
    case 'error':
      return '导入失败';
    default:
      return '可选上传 PDF，通过 AI 提取结构化简历并替换当前会话内容。';
  }
}

function providerHelpText(provider: ResumeImportProvider) {
  switch (provider) {
    case 'openai-compatible':
      return '';
    case 'anthropic-compatible':
      return '使用 Anthropic Messages 兼容协议，不直接上传 PDF，依赖本地提取出的文本。';
    default:
      return '使用 OpenAI Responses API，可直接把 PDF 发给模型，并附带本地文本作为辅助上下文。';
  }
}

function modelPlaceholder(provider: ResumeImportProvider) {
  switch (provider) {
    case 'openai-compatible':
    case 'anthropic-compatible':
      return 'MiniMax-M2.7';
    default:
      return 'gpt-5';
  }
}

function baseUrlPlaceholder(provider: ResumeImportProvider) {
  switch (provider) {
    case 'anthropic-compatible':
      return 'https://api.minimaxi.com/anthropic';
    default:
      return 'https://api.openai.com/v1';
  }
}

export function ResumeImportModal({
  config,
  error,
  isOpen,
  review,
  status,
  onApply,
  onClose,
  onConfigChange,
  onReset,
  onSelectFile,
}: ResumeImportModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isBusy = status === 'extracting' || status === 'parsing';
  const providerHint =
    PROVIDER_OPTIONS.find((option) => option.value === config.provider)?.hint ?? '';
  const providerHelp = providerHelpText(config.provider);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="导入 PDF 简历"
      description="不导入也可使用内置 resume.ts 预览和导出 PDF；导入仅覆盖当前页面显示。"
    >
      <div className="flex max-h-[92vh] flex-col">
        <div className="border-b border-[var(--line)] px-6 py-4 pr-16">
          <p className="text-base font-semibold text-slate-950">导入 PDF 简历</p>
          <p className="mt-1 text-sm text-slate-500">{statusText(status)}</p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/80 px-6 py-6">
          <Card className="bg-white">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">AI 导入配置</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    API Key 仅保存在当前浏览器会话中。
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    disabled={isBusy}
                    onClick={() => inputRef.current?.click()}
                    icon={
                      isBusy ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <FileInput className="size-4" />
                      )
                    }
                  >
                    {isBusy ? '处理中...' : '选择 PDF'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={isBusy}
                    onClick={onReset}
                    icon={<RotateCcw className="size-4" />}
                  >
                    清空结果
                  </Button>
                </div>
              </div>

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
                    onChange={(event) =>
                      onConfigChange({ apiKey: event.target.value })
                    }
                    placeholder="sk-..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Model
                  </span>
                  <input
                    type="text"
                    value={config.model}
                    onChange={(event) =>
                      onConfigChange({ model: event.target.value })
                    }
                    placeholder={modelPlaceholder(config.provider)}
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
                    onChange={(event) =>
                      onConfigChange({ baseUrl: event.target.value })
                    }
                    placeholder={baseUrlPlaceholder(config.provider)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>
              </div>

              {providerHelp ? (
                <p className="text-sm leading-6 text-slate-600">{providerHelp}</p>
              ) : null}
              <p className="text-sm leading-6 text-slate-600">
                {providerHint ? `${providerHint} ` : ''}
                支持最大 10MB 的 PDF，并尽量保留原文语言。导入结果只影响当前会话，不会修改仓库里的 resume.ts。
              </p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onSelectFile(file);
                }
                event.currentTarget.value = '';
              }}
            />
          </Card>

          {isBusy ? (
            <Card className="border-slate-200 bg-slate-950 text-white">
              <div className="flex items-start gap-4">
                <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <LoaderCircle className="size-5 animate-spin" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {status === 'extracting'
                      ? '正在读取 PDF 与准备上下文'
                      : '正在调用 AI 提取结构化简历'}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          {review ? (
            <>
              <Card className="bg-white">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="size-4" />
                      <span>已生成会话简历草稿</span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      {review.file.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatFileSize(review.file.size)} · 模型 {review.meta.model}
                    </p>
                  </div>
                  <Button variant="primary" size="sm" onClick={onApply}>
                    应用到当前页面
                  </Button>
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="bg-white">
                  <p className="text-sm font-semibold text-slate-900">基本信息</p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">姓名</dt>
                      <dd className="mt-1 text-slate-900">
                        {review.resume.basics.name || '未识别'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">职位标题</dt>
                      <dd className="mt-1 text-slate-900">
                        {review.resume.basics.title || '未识别'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">摘要</dt>
                      <dd className="mt-1 text-slate-700">
                        {review.resume.basics.summary || '未识别'}
                      </dd>
                    </div>
                  </dl>
                </Card>

                <Card className="bg-white">
                  <p className="text-sm font-semibold text-slate-900">解析结果概览</p>
                  <ul className="mt-4 grid gap-3 text-sm text-slate-700">
                    <li>工作经历：{review.resume.experience.length} 条</li>
                    <li>项目经历：{review.resume.projects.length} 条</li>
                    <li>技能分组：{review.resume.skills.length} 组</li>
                    <li>教育经历：{review.resume.education.length} 条</li>
                    <li>证书荣誉：{review.resume.certificates.length} 条</li>
                    <li>联系方式：{review.resume.contactLinks.length} 条</li>
                  </ul>
                  <p className="mt-4 text-xs leading-6 text-slate-500">
                    {review.meta.usedLocalTextPreview
                      ? '已附带本地文本预览作为辅助上下文。'
                      : '本次未生成本地文本预览，结果完全来自 AI 对 PDF 的理解。'}
                  </p>
                </Card>
              </div>

              {review.draft.warnings.length ? (
                <Card className="border-amber-200 bg-amber-50/80">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        需要人工确认
                      </p>
                      <ul className="mt-3 grid gap-2 text-sm leading-6 text-amber-800">
                        {review.draft.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              ) : null}

              {review.draft.rawText ? (
                <Card className="bg-white">
                  <p className="text-sm font-semibold text-slate-900">
                    本地文本预览
                  </p>
                  <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                    {review.draft.rawText.slice(0, 4000)}
                  </pre>
                </Card>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
