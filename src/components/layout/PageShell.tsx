import {
  BriefcaseBusiness,
  Check,
  Download,
  FileInput,
  FilePenLine,
  FileText,
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
  onToggleEditing: () => void;
  onTemplateChange: (templateId: PdfTemplateId) => void;
  onExportPdf: () => void;
  onViewPdf: () => void;
  children: ReactNode;
};

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
  onToggleEditing,
  onTemplateChange,
  onExportPdf,
  onViewPdf,
  children,
}: PageShellProps) {
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
      label: '自动',
      description: `当前${resolvedTheme === 'dark' ? '深色' : '浅色'}`,
      icon: Monitor,
    },
    {
      value: 'light',
      label: '浅色',
      description: '明亮阅读',
      icon: Sun,
    },
    {
      value: 'dark',
      label: '深色',
      description: '低亮阅读',
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
                  aria-label="导入 PDF"
                >
                  导入 PDF
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
                  aria-label={isEditing ? '完成编辑' : '编辑'}
                >
                  {isEditing ? '完成编辑' : '编辑'}
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
                  aria-label="AI 助手"
                >
                  AI 助手
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
                  aria-label="投递追踪"
                >
                  投递追踪
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
                  aria-label="更多操作"
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
                          更多操作
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
                              PDF 模板
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
                            <span>{isPdfBusy ? '生成中...' : '预览 PDF'}</span>
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
                            <span>{isPdfBusy ? '导出中...' : '导出 PDF'}</span>
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
                            <span>恢复默认简历</span>
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
              aria-label="页面显示模式"
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
          </div>
        </Container>
      </header>

      {children}
    </div>
  );
}
