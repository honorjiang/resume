import { AlertCircle } from 'lucide-react';
import { useLanguageMode } from '../../hooks/useLanguageMode';

type ApiKeyWarningProps = {
  onClear: () => void;
};

export function ApiKeyWarning({ onClear }: ApiKeyWarningProps) {
  const { t } = useLanguageMode();

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <div className="flex-1 space-y-1">
          <p>
            {t('apiKeyWarning.description')}
          </p>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
          >
            {t('apiKeyWarning.clearKey')}
          </button>
        </div>
      </div>
    </div>
  );
}
