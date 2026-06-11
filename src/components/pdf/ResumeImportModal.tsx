import {
  AlertCircle,
  CheckCircle2,
  FileInput,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react';
import { useRef } from 'react';
import { formatFileSize } from '../../lib/format';
import { useLanguageMode } from '../../hooks/useLanguageMode';
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
}> = [
  {
    value: 'openai-responses',
    label: 'OpenAI Responses',
  },
  {
    value: 'openai-compatible',
    label: 'OpenAI Compatible',
  },
  {
    value: 'anthropic-compatible',
    label: 'Anthropic Compatible',
  },
];

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
  const { t } = useLanguageMode();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isBusy = status === 'extracting' || status === 'parsing';

  const statusMessage = (() => {
    switch (status) {
      case 'extracting':
        return t('importer.extracting');
      case 'parsing':
        return t('importer.parsing');
      case 'ready':
        return t('importer.ready');
      case 'error':
        return t('importer.error');
      default:
        return t('importer.statusHint');
    }
  })();

  const providerHelp = (() => {
    switch (config.provider) {
      case 'openai-compatible':
        return t('importer.openaiCompatibleHint');
      case 'anthropic-compatible':
        return t('importer.anthropicHint');
      default:
        return t('importer.openaiResponsesHint');
    }
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('importer.title')}
      description={t('importer.description')}
    >
      <div className="flex max-h-[92vh] flex-col">
        <div className="border-b border-[var(--line)] px-6 py-4 pr-16">
          <p className="text-base font-semibold text-slate-950">{t('importer.title')}</p>
          <p className="mt-1 text-sm text-slate-500">{statusMessage}</p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/80 px-6 py-6">
          <Card className="bg-white">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t('importer.importConfig')}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t('importer.keySavedInSession')}
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
                    {isBusy ? t('importer.processing') : t('importer.choosePdf')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={isBusy}
                    onClick={onReset}
                    icon={<RotateCcw className="size-4" />}
                  >
                    {t('importer.clearResult')}
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
                {t('importer.importDetail')}
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
                      ? t('importer.extracting')
                      : t('importer.parsing')}
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
                      <span>{t('importer.generatedSessionDraft')}</span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      {review.file.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatFileSize(review.file.size)} · {review.meta.model}
                    </p>
                  </div>
                  <Button variant="primary" size="sm" onClick={onApply}>
                    {t('importer.applyToCurrent')}
                  </Button>
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="bg-white">
                  <p className="text-sm font-semibold text-slate-900">{t('importer.basicInfo')}</p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">{t('importer.fieldName')}</dt>
                      <dd className="mt-1 text-slate-900">
                        {review.resume.basics.name || t('importer.notRecognized')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t('importer.fieldTitle')}</dt>
                      <dd className="mt-1 text-slate-900">
                        {review.resume.basics.title || t('importer.notRecognized')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t('importer.fieldSummary')}</dt>
                      <dd className="mt-1 text-slate-700">
                        {review.resume.basics.summary || t('importer.notRecognized')}
                      </dd>
                    </div>
                  </dl>
                </Card>

                <Card className="bg-white">
                  <p className="text-sm font-semibold text-slate-900">{t('importer.summaryPreview')}</p>
                  <ul className="mt-4 grid gap-3 text-sm text-slate-700">
                    <li>{t('importer.summaryExperience')}: {review.resume.experience.length}</li>
                    <li>{t('importer.summaryProjects')}: {review.resume.projects.length}</li>
                    <li>{t('importer.summarySkills')}: {review.resume.skills.length}</li>
                    <li>{t('importer.summaryEducation')}: {review.resume.education.length}</li>
                    <li>{t('importer.summaryCertificates')}: {review.resume.certificates.length}</li>
                    <li>{t('importer.summaryContacts')}: {review.resume.contactLinks.length}</li>
                  </ul>
                  <p className="mt-4 text-xs leading-6 text-slate-500">
                    {review.meta.usedLocalTextPreview
                      ? t('importer.usedLocalPreview')
                      : t('importer.noLocalPreview')}
                  </p>
                </Card>
              </div>

              {review.draft.warnings.length ? (
                <Card className="border-amber-200 bg-amber-50/80">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        {t('importer.manualConfirmTitle')}
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
                    {t('importer.rawTextTitle')}
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
