import { LoaderCircle, Sparkles, Target } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEventHandler,
} from 'react';
import type { ResumeAiTextFormat } from '../../types/resume-ai';
import { useLanguageMode } from '../../hooks/useLanguageMode';
import { useResumeEditor } from './ResumeEditorContext';

type EditableTextProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  inputClassName?: string;
  displayClassName?: string;
  displayAs?: 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3';
  rows?: number;
  autoGrow?: boolean;
  extraGrowRows?: number;
  aiEnabled?: boolean;
  aiSectionLabel?: string;
  aiFieldLabel?: string;
  aiContextHint?: string;
  aiFormat?: ResumeAiTextFormat;
  allowStarRewrite?: boolean;
  fieldPath?: string;
  fieldPathPrefix?: boolean;
  aiComparisonValue?: string;
};

export function EditableText({
  value = '',
  onChange,
  placeholder,
  multiline = false,
  inputClassName,
  displayClassName,
  displayAs = 'div',
  rows = 3,
  autoGrow = false,
  extraGrowRows = 0,
  aiEnabled = true,
  aiSectionLabel,
  aiFieldLabel,
  aiContextHint,
  aiFormat,
  allowStarRewrite = multiline,
  fieldPath,
  fieldPathPrefix = false,
  aiComparisonValue,
}: EditableTextProps) {
  const {
    isEditing,
    canUseAi,
    activeAiActionKey,
    activeAiActionLabel,
    runAiTextAction,
    getAiEditedState,
    clearAiEditedField,
  } = useResumeEditor();
  const { t } = useLanguageMode();
  const displayValue = value || placeholder || '';
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const aiActionKey = useId();
  const [lastAiAction, setLastAiAction] = useState<'polish' | 'star' | null>(null);
  const [aiEditedValue, setAiEditedValue] = useState<string | null>(null);
  const effectiveAiFormat = aiFormat ?? (multiline ? 'paragraph' : 'short');
  const isAiBusy = activeAiActionKey === aiActionKey;
  const globalAiEditState = getAiEditedState(
    fieldPath,
    aiComparisonValue ?? value,
    fieldPathPrefix,
  );
  const isLocalAiEdited = aiEditedValue !== null && value === aiEditedValue;
  const localAiEditedLabel =
    lastAiAction === 'star' ? t('editor.aiRewrittenLabel') : t('editor.aiPolishedLabel');
  const isAiEdited = globalAiEditState.isAiEdited || isLocalAiEdited;
  const aiEditedLabel = globalAiEditState.label ?? localAiEditedLabel;

  const handleChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (
    event,
  ) => {
    if (fieldPath) {
      clearAiEditedField(fieldPath, fieldPathPrefix);
    }

    onChange(event.target.value);
  };

  async function handleAiAction(action: 'polish' | 'star') {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return;
    }

    try {
      const rewrittenText = await runAiTextAction({
        actionKey: aiActionKey,
        action,
        value: normalizedValue,
        fieldPath,
        sectionLabel: aiSectionLabel,
        fieldLabel: aiFieldLabel ?? placeholder ?? '当前字段',
        contextHint: aiContextHint,
        format: effectiveAiFormat,
      });

      setLastAiAction(action);
      setAiEditedValue(rewrittenText);
      onChange(rewrittenText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 处理失败，请重试。';
      window.alert(message);
    }
  }

  useEffect(() => {
    if (!isEditing || !multiline || !autoGrow || !textareaRef.current) {
      return;
    }

    const textarea = textareaRef.current;
    textarea.style.height = 'auto';

    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight);
    const fontSize = Number.parseFloat(computedStyle.fontSize);
    const fallbackLineHeight = Number.isFinite(fontSize) ? fontSize * 1.5 : 24;
    const resolvedLineHeight = Number.isFinite(lineHeight)
      ? lineHeight
      : fallbackLineHeight;
    const extraHeight = resolvedLineHeight * extraGrowRows;

    textarea.style.height = `${textarea.scrollHeight + extraHeight}px`;
  }, [autoGrow, extraGrowRows, isEditing, multiline, value]);

  if (!isEditing) {
    const Tag = displayAs;
    return (
      <Tag className={displayClassName}>
        <span
          className={isAiEdited ? 'resume-ai-edited-text' : undefined}
        >
          {displayValue}
        </span>
      </Tag>
    );
  }

  if (multiline) {
    return (
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={value}
          rows={rows}
          onChange={handleChange}
          placeholder={placeholder}
          style={autoGrow ? { overflow: 'hidden', resize: 'none' } : undefined}
          className={[
            'w-full rounded-2xl border border-sky-200 bg-white/90 px-3 py-2 text-[var(--ink)] caret-[var(--ink)] outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400',
            isAiEdited ? 'resume-ai-edited-field' : undefined,
            inputClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {((aiEnabled && canUseAi && value.trim()) || isAiEdited) ? (
          <div className="flex flex-wrap gap-2">
            {isAiEdited ? (
              <span className="resume-ai-edited-badge">{aiEditedLabel}</span>
            ) : null}
            <button
              type="button"
              disabled={Boolean(activeAiActionKey)}
              onClick={() => {
                void handleAiAction('polish');
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAiBusy && activeAiActionLabel === 'polish' ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              <span>{t('editor.aiPolish')}</span>
            </button>
            {allowStarRewrite ? (
              <button
                type="button"
                disabled={Boolean(activeAiActionKey)}
                onClick={() => {
                  void handleAiAction('star');
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAiBusy && activeAiActionLabel === 'star' ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Target className="size-3.5" />
                )}
                <span>{t('editor.aiStar')}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={[
          'w-full rounded-2xl border border-sky-200 bg-white/90 px-3 py-2 text-[var(--ink)] caret-[var(--ink)] outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400',
          isAiEdited ? 'resume-ai-edited-field' : undefined,
          inputClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {((aiEnabled && canUseAi && value.trim()) || isAiEdited) ? (
        <div className="flex flex-wrap gap-2">
          {isAiEdited ? (
            <span className="resume-ai-edited-badge">{aiEditedLabel}</span>
          ) : null}
          <button
            type="button"
            disabled={Boolean(activeAiActionKey)}
            onClick={() => {
              void handleAiAction('polish');
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAiBusy && activeAiActionLabel === 'polish' ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span>{t('editor.aiPolish')}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
