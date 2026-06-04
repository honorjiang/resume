import { motion } from 'framer-motion';
import { ArrowDownRight, MapPin } from 'lucide-react';
import type { BasicInfo } from '../../types/resume';
import { EditableText } from '../editor/EditableText';
import { formatCommaList, parseCommaList } from '../editor/list-format';
import { useResumeEditor } from '../editor/ResumeEditorContext';
import { Container } from '../layout/Container';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

type HeroSectionProps = {
  basics: BasicInfo;
};

export function HeroSection({ basics }: HeroSectionProps) {
  const { isEditing, updateResume } = useResumeEditor();
  const positioningLine = basics.subtitle || basics.summary;

  const panelClass = isEditing
    ? 'border border-[var(--line)] bg-white/82 text-slate-900'
    : 'border border-slate-900/80 bg-slate-950 text-white';
  const panelTagClass = isEditing
    ? 'border border-sky-200 bg-sky-50 text-sky-700'
    : 'border border-sky-300/20 bg-sky-300/10 text-sky-200';
  const panelMetaCardClass = isEditing
    ? 'border border-slate-200 bg-slate-50/90'
    : 'border border-white/10 bg-white/5';
  const panelMetaLabelClass = isEditing ? 'text-slate-500' : 'text-slate-400';
  const panelTitleDisplayClass = isEditing
    ? 'max-w-md text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]'
    : 'max-w-md text-3xl font-semibold tracking-tight text-white sm:text-[2.15rem]';
  const panelBodyDisplayClass = isEditing
    ? 'max-w-lg text-sm font-medium leading-7 text-slate-700 sm:text-[15px]'
    : 'max-w-lg text-sm font-medium leading-7 text-slate-200 sm:text-[15px]';
  const panelLocationDisplayClass = isEditing
    ? 'mt-3 text-sm font-medium text-slate-800'
    : 'mt-3 text-sm font-medium text-white';
  const panelTitleInputClass = isEditing
    ? 'max-w-md text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]'
    : 'max-w-md border-white/15 bg-slate-900/80 text-3xl font-semibold tracking-tight text-white placeholder:text-slate-500 focus:border-sky-300 sm:text-[2.15rem]';
  const panelBodyInputClass = isEditing
    ? 'max-w-lg text-sm font-medium leading-7 text-slate-700 sm:text-[15px]'
    : 'max-w-lg border-white/12 bg-slate-900/70 text-sm font-medium leading-7 text-slate-100 placeholder:text-slate-500 focus:border-sky-300 sm:text-[15px]';
  const panelLocationInputClass = isEditing
    ? 'mt-3 text-sm font-medium text-slate-700'
    : 'mt-3 border-white/15 bg-slate-900/80 text-sm font-medium text-white placeholder:text-slate-500 focus:border-sky-300';

  return (
    <section
      id="hero"
      className="overflow-hidden border-b border-[var(--line)] bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.72))] px-3 py-8 sm:px-4 sm:py-10"
    >
      <Container>
        <div className="relative rounded-[2rem] border border-white/75 bg-white/68 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:rounded-[2.35rem] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="space-y-8"
            >
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
                  个人简历
                </p>
                <div className="space-y-4">
                  <EditableText
                    value={basics.name}
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.basics.name = value;
                      })
                    }
                    displayAs="h1"
                    displayClassName="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl"
                    inputClassName="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl"
                  />
                  <EditableText
                    value={basics.title}
                    fieldPath="basics.title"
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.basics.title = value;
                      })
                    }
                    displayAs="p"
                    displayClassName="max-w-3xl text-xl font-medium text-slate-700 sm:text-2xl"
                    inputClassName="max-w-3xl text-xl font-medium text-slate-700 sm:text-2xl"
                  />
                  <EditableText
                    value={basics.subtitle ?? ''}
                    fieldPath="basics.subtitle"
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.basics.subtitle = value;
                      })
                    }
                    multiline
                    rows={3}
                    placeholder="补充一句定位或亮点描述"
                    displayAs="p"
                    displayClassName="max-w-3xl text-lg leading-8 text-slate-600"
                    inputClassName="max-w-3xl text-lg leading-8 text-slate-600"
                  />
                  <EditableText
                    value={basics.summary ?? ''}
                    fieldPath="basics.summary"
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.basics.summary = value;
                      })
                    }
                    multiline
                    rows={4}
                    placeholder="补充简历摘要"
                    displayAs="p"
                    displayClassName="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg"
                    inputClassName="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg"
                  />
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    关注标签
                  </p>
                  <EditableText
                    value={formatCommaList(basics.focusTags)}
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.basics.focusTags = parseCommaList(value);
                      })
                    }
                    multiline
                    rows={2}
                    placeholder="使用逗号分隔标签"
                    inputClassName="text-sm text-slate-700"
                  />
                </div>
              ) : basics.focusTags.length ? (
                <div className="flex flex-wrap gap-3">
                  {basics.focusTags.map((tag) => (
                    <Badge key={tag} tone="accent">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
              className="grid gap-4"
            >
              <div
                className={[
                  'relative overflow-hidden rounded-[28px] shadow-[0_30px_82px_rgba(15,23,42,0.22)]',
                  panelClass,
                ].join(' ')}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/80 to-transparent" />

                <div className="relative space-y-8 p-7 sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-4">
                      <div
                        className={[
                          'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]',
                          panelTagClass,
                        ].join(' ')}
                      >
                        <span className="size-1.5 rounded-full bg-sky-300" />
                        核心定位
                      </div>
                      <div className="space-y-3">
                        <EditableText
                          value={basics.title}
                          fieldPath="basics.title"
                          onChange={(value) =>
                            updateResume((draft) => {
                              draft.basics.title = value;
                            })
                          }
                          displayAs="h2"
                          displayClassName={panelTitleDisplayClass}
                          inputClassName={panelTitleInputClass}
                        />
                        <EditableText
                          value={positioningLine ?? ''}
                          onChange={(value) =>
                            updateResume((draft) => {
                              draft.basics.subtitle = value;
                            })
                          }
                          multiline
                          rows={3}
                          autoGrow
                          extraGrowRows={2}
                          placeholder="补充定位说明"
                          displayAs="p"
                          displayClassName={panelBodyDisplayClass}
                          inputClassName={panelBodyInputClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 sm:text-right">
                      <div
                        className={[
                          'min-w-[9.25rem] rounded-2xl px-4 py-4 text-left sm:text-right',
                          panelMetaCardClass,
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] sm:ml-auto sm:justify-end',
                            panelMetaLabelClass,
                          ].join(' ')}
                        >
                          <MapPin className="size-3.5" />
                          工作地点
                        </div>
                        <EditableText
                          value={basics.location ?? ''}
                          onChange={(value) =>
                            updateResume((draft) => {
                              draft.basics.location = value;
                            })
                          }
                          placeholder="面议"
                          displayAs="p"
                          displayClassName={panelLocationDisplayClass}
                          inputClassName={panelLocationInputClass}
                        />
                      </div>
                      <div
                        className={[
                          'no-print min-w-[9.25rem] rounded-2xl px-4 py-4 text-left sm:text-right',
                          panelMetaCardClass,
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'text-xs uppercase tracking-[0.18em]',
                            panelMetaLabelClass,
                          ].join(' ')}
                        >
                          联系入口
                        </div>
                        <Button
                          href="#contact"
                          variant="ghost"
                          size="sm"
                          icon={<ArrowDownRight className="size-4" />}
                          className={[
                            'mt-3 w-full justify-between px-0 sm:ml-auto sm:w-auto sm:justify-end',
                            isEditing
                              ? '!text-slate-700 hover:bg-transparent hover:!text-slate-950 focus-visible:ring-sky-300 focus-visible:ring-offset-white'
                              : '!text-white hover:bg-transparent hover:!text-white focus-visible:ring-white/60 focus-visible:ring-offset-slate-950',
                          ].join(' ')}
                        >
                          联系方式
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
