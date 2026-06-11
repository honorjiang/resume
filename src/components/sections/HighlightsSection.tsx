import { motion } from 'framer-motion';
import { getHighlightIcon } from '../../lib/icons';
import type { Highlight } from '../../types/resume';
import { useLanguageMode } from '../../hooks/useLanguageMode';
import { EditorRemoveButton, EditorSectionActions } from '../editor/EditorActions';
import { createHighlightDraft } from '../editor/resume-draft-factories';
import { EditableText } from '../editor/EditableText';
import { useResumeEditor } from '../editor/ResumeEditorContext';
import { Section } from '../layout/Section';
import { Card } from '../ui/Card';

type HighlightsSectionProps = {
  items: Highlight[];
};

export function HighlightsSection({ items }: HighlightsSectionProps) {
  const { isEditing, updateResume } = useResumeEditor();
  const { t } = useLanguageMode();

  return (
    <Section
      id="highlights"
      eyebrow={t('section.highlightsEyebrow')}
      title={t('section.highlights')}
      className="bg-slate-50/80"
    >
      <EditorSectionActions
        isEditing={isEditing}
        addLabel={t('editor.addHighlight')}
        isEmpty={!items.length}
        emptyMessage={t('editor.highlightEmpty')}
        onAdd={() =>
          updateResume((draft) => {
            draft.highlights.push(createHighlightDraft());
          })
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => {
          const Icon = getHighlightIcon(item.icon);

          return (
            <motion.div
              key={`highlight-${index}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
            >
              <Card className="group h-full bg-white/90">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-[var(--accent)] transition group-hover:scale-105 group-hover:bg-slate-950 group-hover:text-white">
                      <Icon className="size-5" />
                    </div>
                    {isEditing ? (
                      <EditorRemoveButton
                        onRemove={() =>
                          updateResume((draft) => {
                            draft.highlights.splice(index, 1);
                          })
                        }
                      />
                    ) : null}
                  </div>
                  <div className="mt-5 space-y-3">
                    <EditableText
                      value={item.metric ?? ''}
                      fieldPath={`highlights.${index}.metric`}
                      onChange={(value) =>
                        updateResume((draft) => {
                          draft.highlights[index].metric = value;
                        })
                      }
                      placeholder={t('editor.placeholderHighlightTitle')}
                      displayAs="p"
                      displayClassName="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400"
                      inputClassName="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
                    />
                    <EditableText
                      value={item.title}
                      fieldPath={`highlights.${index}.title`}
                      onChange={(value) =>
                        updateResume((draft) => {
                          draft.highlights[index].title = value;
                        })
                      }
                      displayAs="h3"
                      displayClassName="text-lg font-semibold text-slate-950"
                      inputClassName="text-lg font-semibold text-slate-950"
                    />
                    <EditableText
                      value={item.description}
                      fieldPath={`highlights.${index}.description`}
                      onChange={(value) =>
                        updateResume((draft) => {
                          draft.highlights[index].description = value;
                        })
                      }
                      multiline
                      rows={4}
                      displayAs="p"
                      displayClassName="text-sm leading-7 text-slate-600"
                      inputClassName="text-sm leading-7 text-slate-600"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}
