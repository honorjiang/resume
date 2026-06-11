import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Download,
  FileInput,
  FilePenLine,
  FileText,
  Globe,
  LayoutTemplate,
  Monitor,
  Moon,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ResolvedTheme, ThemeMode } from '../../hooks/useThemeMode';
import type { LanguageMode } from '../../hooks/useLanguageMode';
import { useLanguageMode } from '../../hooks/useLanguageMode';
import type { PdfTemplateId } from '../../types/pdf-template';
import { Button } from '../ui/Button';
import { Container } from './Container';

type PageShellProps = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  canViewPdf: boolean;
  canExportPdf: boolean;
  showEditing: boolean;
  showImport: boolean;
  showViewPdf: boolean;
  showExportPdf: boolean;
  showTemplateSelect: boolean;
  showAiWorkbench: boolean;
  showApplicationTracker: boolean;
  isEditing: boolean;
  isPdfBusy: boolean;
  hasSessionResume: boolean;
  selectedTemplateId: PdfTemplateId;
  templateOptions: Array<{
    id: PdfTemplateId;
    name: string;
    description?: string;
  }>;
  onOpenImport: () => void;
  onOpenAiWorkbench: () => void;
  onOpenApplicationTracker: () => void;
  onRestoreDefault: () => void;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onLanguageModeChange: (lang: LanguageMode) => void;
  showLanguageToggle?: boolean;
  onToggleEditing: () => void;
  onTemplateChange: (templateId: PdfTemplateId) => void;
  onExportPdf: () => void;
  onViewPdf: () => void;
  children: ReactNode;
};

/** 语言选择器：常用语言快捷选择 + 自定义语言输入 */
const QUICK_LANGUAGES: { code: string; label: string }[] = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
];

function LanguageSelector({
  current,
  onChange,
  resolvedTheme,
}: {
  current: string;
  onChange: (lang: string) => void;
  resolvedTheme: ResolvedTheme;
}) {
  const [open, setOpen] = useState(false);
  const [customLang, setCustomLang] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLanguageMode();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentLabel =
    QUICK_LANGUAGES.find((l) => l.code === current)?.label ?? current.toUpperCase();

  const textColor =
    resolvedTheme === 'dark'
      ? 'text-slate-400 hover:text-white'
      : 'text-slate-500 hover:text-slate-950';

  function handleCustomSubmit() {
    const trimmed = customLang.trim();
    if (!trimmed) return;
    // 用户可能输入语言名称（如 "Japanese"）或代码（如 "ja"）
    // 如果是已知代码直接使用，否则作为语言名称传给 AI
    const knownCode = QUICK_LANGUAGES.find(
      (l) => l.code === trimmed.toLowerCase() || l.label.toLowerCase() === trimmed.toLowerCase(),
    );
    onChange(knownCode ? knownCode.code : trimmed.toLowerCase());
    setCustomLang('');
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('nav.languageToggle')}
        className={[
          'inline-flex h-7 items-center gap-1 px-2 text-xs font-semibold tracking-wide transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded-sm sm:h-8 sm:px-3 sm:text-sm',
          textColor,
        ].join(' ')}
      >
        <Globe className="size-3.5" />
        {currentLabel}
        <ChevronDown className="size-3" />
      </button>

      {open ? (
        <div
          className={[
            'absolute right-0 top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl border shadow-lg',
            resolvedTheme === 'dark'
              ? 'border-slate-700 bg-slate-900'
              : 'border-slate-200 bg-white',
          ].join(' ')}
        >
          {QUICK_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                onChange(lang.code);
                setOpen(false);
              }}
              className={[
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition',
                lang.code === current
                  ? 'font-semibold text-sky-600'
                  : resolvedTheme === 'dark'
                    ? 'text-slate-300 hover:bg-white/5'
                    : 'text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              {lang.code === current ? <Check className="size-3.5" /> : <span className="size-3.5" />}
              {lang.label}
            </button>
          ))}

          <div
            className={[
              'border-t px-3 py-2',
              resolvedTheme === 'dark' ? 'border-slate-700' : 'border-slate-200',
            ].join(' ')}
          >
            <p
              className={[
                'mb-1.5 text-[11px] font-medium uppercase tracking-wider',
                resolvedTheme === 'dark' ? 'text-slate-500' : 'text-slate-400',
              ].join(' ')}
            >
              其他语言
            </p>
            <div className="flex gap-1">
              <input
                type="text"
                value={customLang}
                onChange={(e) => setCustomLang(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomSubmit();
                }}
                placeholder="如: fr, de, ru..."
                className={[
                  'min-w-0 flex-1 rounded-lg border px-2 py-1 text-xs outline-none transition',
                  resolvedTheme === 'dark'
                    ? 'border-slate-600 bg-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-sky-500'
                    : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-sky-500',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={handleCustomSubmit}
                className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PageShell({
  themeMode,
  resolvedTheme,
  canViewPdf,
  canExportPdf,
  showEditing,
  showImport,
  showViewPdf,
  showExportPdf,
  showTemplateSelect,
  showAiWorkbench,
  showApplicationTracker,
  isEditing,
  isPdfBusy,
  hasSessionResume,
  selectedTemplateId,
  templateOptions,
  onOpenImport,
  onOpenAiWorkbench,
  onOpenApplicationTracker,
  onRestoreDefault,
  onThemeModeChange,
  onLanguageModeChange,
  showLanguageToggle = false,
  onToggleEditing,
  onTemplateChange,
  onExportPdf,
  onViewPdf,
  children,
}: PageShellProps) {
  const { t, mode: languageMode } = useLanguageMode();
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const themeOptions: Array<{
    value: ThemeMode;
    label: string;
    description: string;
    icon: typeof Sun;
  }> = [
    {
      value: 'system',
      label: t('nav.auto'),
      description:
        resolvedTheme === 'dark'
          ? t('nav.autoThemeDescription')
          : t('nav.autoThemeDescriptionLight'),
      icon: Monitor,
    },
    {
      value: 'light',
      label: t('nav.light'),
      description: t('nav.lightThemeDescription'),
      icon: Sun,
    },
    {
      value: 'dark',
      label: t('nav.dark'),
      description: t('nav.darkThemeDescription'),
      icon: Moon,
    },
  ];
  const activeThemeOption =
    themeOptions.find((option) => option.value === themeMode) ?? themeOptions[0];

  const quietActionClass =
    resolvedTheme === 'dark'
      ? '!rounded-full !border-transparent !bg-transparent !text-slate-300 hover:!bg-slate-900/80 hover:!text-white disabled:!bg-transparent disabled:!text-slate-500'
      : '!rounded-full !border-transparent !bg-transparent !text-slate-600 hover:!bg-slate-100 hover:!text-slate-950 disabled:!bg-transparent disabled:!text-slate-400';
  const activeEditClass =
    resolvedTheme === 'dark'
      ? '!rounded-full !border-transparent !bg-white !text-slate-950 hover:!bg-slate-100'
      : '!rounded-full !border-transparent !bg-slate-950 !text-white hover:!bg-slate-800';
  const floatingMenuShellClass =
    resolvedTheme === 'dark'
      ? 'border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(10,15,28,0.96))] shadow-[0_28px_80px_rgba(2,6,23,0.45)]'
      : 'border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_28px_80px_rgba(15,23,42,0.14)]';
  const templateMenuInnerClass =
    resolvedTheme === 'dark'
      ? 'border-slate-800/70 bg-slate-950/40'
      : 'border-slate-200/70 bg-white/78';
  const templateMenuCaptionClass =
    resolvedTheme === 'dark' ? 'text-slate-500' : 'text-slate-400';
  const templateMenuTitleClass =
    resolvedTheme === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const inactiveTemplateOptionClass =
    resolvedTheme === 'dark'
      ? 'border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/55'
      : 'border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50/90';
  const activeTemplateOptionClass =
    resolvedTheme === 'dark'
      ? 'border-slate-700 bg-slate-900/76 text-white'
      : 'border-slate-200 bg-slate-50 text-slate-950';
  const inactiveThemeButtonClass =
    resolvedTheme === 'dark'
      ? 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';
  const activeThemeButtonClass =
    resolvedTheme === 'dark'
      ? 'border-transparent bg-sky-400/16 text-white shadow-none'
      : 'border-transparent bg-slate-950 text-white shadow-none';
  const menuActionClass =
    resolvedTheme === 'dark'
      ? 'text-slate-200 hover:border-slate-700 hover:bg-slate-900/70'
      : 'text-slate-700 hover:border-slate-200 hover:bg-slate-50/90';
  const menuDangerClass =
    resolvedTheme === 'dark'
      ? 'text-amber-100 hover:border-amber-500/30 hover:bg-amber-500/10'
      : 'text-amber-800 hover:border-amber-200 hover:bg-amber-50';

  useEffect(() => {
    if (!actionMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (!actionMenuRef.current?.contains(target)) {
        setActionMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActionMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [actionMenuOpen]);

  const closeActionMenu = () => setActionMenuOpen(false);

  return (
    <div className="relative overflow-x-hidden">
      <header className="no-print fixed inset-x-0 top-0 z-40 border-b border-[var(--line)] bg-[var(--header)] backdrop-blur-xl transition-colors duration-300">
        <Container>
          <div className="flex items-center gap-2 py-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
              {showImport ? (
                <Button
                  variant="ghost"
                  size="toolbar"
                  onClick={onOpenImport}
                  icon={<FileInput className="size-3.5 sm:size-4" />}
                  className={[
                    quietActionClass,
                    '[&_span]:hidden sm:[&_span]:inline',
                  ].join(' ')}
                  aria-label={t('nav.import')}
                >
                  {t('nav.import')}
                </Button>
              ) : null}

              {showEditing ? (
                <Button
                  variant="ghost"
                  size="toolbar"
                  onClick={onToggleEditing}
                  icon={<FilePenLine className="size-3.5 sm:size-4" />}
                  className={[
                    isEditing ? activeEditClass : quietActionClass,
                    '[&_span]:hidden sm:[&_span]:inline',
                  ].join(' ')}
                  aria-label={isEditing ? t('nav.completeEdit') : t('nav.edit')}
                >
                  {isEditing ? t('nav.completeEdit') : t('nav.edit')}
                </Button>
              ) : null}

              {showAiWorkbench ? (
                <Button
                  variant="ghost"
                  size="toolbar"
                  onClick={onOpenAiWorkbench}
                  icon={<Sparkles className="size-3.5 sm:size-4" />}
                  className={[
                    quietActionClass,
                    '[&_span]:hidden sm:[&_span]:inline',
                  ].join(' ')}
                  aria-label={t('nav.aiAssistant')}
                >
                  {t('nav.aiAssistant')}
                </Button>
              ) : null}

              {showApplicationTracker ? (
                <Button
                  variant="ghost"
                  size="toolbar"
                  onClick={onOpenApplicationTracker}
                  icon={<BriefcaseBusiness className="size-3.5 sm:size-4" />}
                  className={[
                    quietActionClass,
                    '[&_span]:hidden sm:[&_span]:inline',
                  ].join(' ')}
                  aria-label={t('nav.applicationTracker')}
                >
                  {t('nav.applicationTracker')}
                </Button>
              ) : null}
            </div>

            <div className="min-w-2 flex-1" />

            {(showTemplateSelect ||
              showViewPdf ||
              showExportPdf ||
              hasSessionResume) ? (
              <div className="relative" ref={actionMenuRef}>
                <button
                  type="button"
                  onClick={() => setActionMenuOpen((current) => !current)}
                  className={[
                    'inline-flex size-9 items-center justify-center rounded-full border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:size-10',
                    resolvedTheme === 'dark'
                      ? 'border-slate-800/70 bg-slate-950/55 text-slate-300 hover:bg-slate-900/80 hover:text-white'
                      : 'border-slate-200/80 bg-white/88 text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                  ].join(' ')}
                  aria-label={t('nav.more')}
                  aria-expanded={actionMenuOpen}
                >
                  <MoreHorizontal className="size-4" />
                </button>

                {actionMenuOpen ? (
                  <div
                    className={[
                      'absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[18rem] overflow-hidden rounded-[1.35rem] border p-2 backdrop-blur-2xl',
                      floatingMenuShellClass,
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'rounded-[1.1rem] border p-2',
                        templateMenuInnerClass,
                      ].join(' ')}
                    >
                      <div className="mb-2 px-2 pt-1">
                        <p
                          className={[
                            'text-[11px] font-semibold uppercase tracking-[0.18em]',
                            templateMenuCaptionClass,
                          ].join(' ')}
                        >
                          More
                        </p>
                        <p
                          className={[
                            'mt-1 text-sm font-semibold',
                            templateMenuTitleClass,
                          ].join(' ')}
                        >
                          {t('nav.moreTitle')}
                        </p>
                      </div>

                      <div className="grid gap-1">
                        {showTemplateSelect ? (
                          <div className="grid gap-1.5">
                            <p
                              className={[
                                'px-2 pb-1 text-xs font-semibold',
                                resolvedTheme === 'dark'
                                  ? 'text-slate-400'
                                  : 'text-slate-500',
                              ].join(' ')}
                            >
                            {t('nav.pdfTemplate')}
                            </p>
                            {templateOptions.map((option) => {
                              const active = option.id === selectedTemplateId;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    onTemplateChange(option.id);
                                  }}
                                  className={[
                                    'flex w-full items-start gap-3 rounded-[1rem] border px-3 py-3 text-left transition duration-200',
                                    active
                                      ? activeTemplateOptionClass
                                      : inactiveTemplateOptionClass,
                                  ].join(' ')}
                                >
                                  <div
                                    className={[
                                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border',
                                      active
                                        ? resolvedTheme === 'dark'
                                          ? 'border-slate-600 bg-slate-800 text-white'
                                          : 'border-slate-300 bg-white text-slate-900'
                                        : resolvedTheme === 'dark'
                                          ? 'border-slate-700 bg-transparent text-slate-500'
                                          : 'border-slate-200 bg-transparent text-slate-400',
                                    ].join(' ')}
                                  >
                                    {active ? (
                                      <Check className="size-3.5" />
                                    ) : (
                                      <LayoutTemplate className="size-3.5" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={[
                                        'text-sm font-semibold',
                                        active
                                          ? resolvedTheme === 'dark'
                                            ? 'text-white'
                                            : 'text-slate-950'
                                          : resolvedTheme === 'dark'
                                            ? 'text-slate-100'
                                            : 'text-slate-900',
                                      ].join(' ')}
                                    >
                                      {option.name}
                                    </p>
                                    {option.description ? (
                                      <p
                                        className={[
                                          'mt-1 text-xs leading-5',
                                          resolvedTheme === 'dark'
                                            ? 'text-slate-400'
                                            : 'text-slate-500',
                                        ].join(' ')}
                                      >
                                        {option.description}
                                      </p>
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}

                        {(showViewPdf || showExportPdf) && showTemplateSelect ? (
                          <div className="my-1 h-px bg-[var(--line)]" />
                        ) : null}

                        {showViewPdf ? (
                          <button
                            type="button"
                            onClick={() => {
                              closeActionMenu();
                              onViewPdf();
                            }}
                            disabled={!canViewPdf || isPdfBusy}
                            className={[
                              'flex w-full items-center gap-3 rounded-[0.95rem] border border-transparent px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
                              menuActionClass,
                            ].join(' ')}
                          >
                            <FileText className="size-4 shrink-0" />
                            <span>{isPdfBusy ? t('nav.exportingPdf') : t('nav.previewPdf')}</span>
                          </button>
                        ) : null}

                        {showExportPdf ? (
                          <button
                            type="button"
                            onClick={() => {
                              closeActionMenu();
                              onExportPdf();
                            }}
                            disabled={!canExportPdf || isPdfBusy}
                            className={[
                              'flex w-full items-center gap-3 rounded-[0.95rem] border border-transparent px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
                              menuActionClass,
                            ].join(' ')}
                          >
                            <Download className="size-4 shrink-0" />
                            <span>{isPdfBusy ? t('nav.exportingPdf') : t('nav.exportPdf')}</span>
                          </button>
                        ) : null}

                        {hasSessionResume ? (
                          <button
                            type="button"
                            onClick={() => {
                              onRestoreDefault();
                            }}
                            className={[
                              'mt-1 flex w-full items-center gap-3 rounded-[0.95rem] border border-transparent px-3 py-2.5 text-left text-sm font-medium transition',
                              menuDangerClass,
                            ].join(' ')}
                          >
                            <RotateCcw className="size-4 shrink-0" />
                            <span>{t('nav.restore')}</span>
                          </button>
                        ) : null}

                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              className={[
                'inline-flex shrink-0 items-center gap-0.5 rounded-full border p-1',
                resolvedTheme === 'dark'
                  ? 'border-slate-800/70 bg-slate-950/55'
                  : 'border-slate-200/80 bg-white/88',
              ].join(' ')}
              role="group"
              aria-label={t('nav.pageDisplayMode')}
            >
              {themeOptions.map((option) => {
                const active = option.value === themeMode;
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={active}
                    onClick={() => onThemeModeChange(option.value)}
                    className={[
                      'inline-flex size-7 items-center justify-center rounded-full border text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:size-8',
                      active
                        ? activeThemeButtonClass
                        : `border-transparent bg-transparent ${inactiveThemeButtonClass}`,
                    ].join(' ')}
                  >
                    <Icon className="size-3.5 sm:size-4" />
                    <span className="sr-only">
                      {option.label}
                      {activeThemeOption.value === option.value
                        ? `，${activeThemeOption.description}`
                        : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {showLanguageToggle ? (
              <LanguageSelector
                current={languageMode}
                onChange={onLanguageModeChange}
                resolvedTheme={resolvedTheme}
              />
            ) : null}
          </div>
        </Container>
      </header>

      {children}
    </div>
  );
}
