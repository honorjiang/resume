import { ArrowUpRight } from 'lucide-react';
import { normalizeContactHref, normalizeContactLabel } from '../../lib/contact';
import { getContactIcon } from '../../lib/icons';
import type { ContactLink } from '../../types/resume';
import { useLanguageMode } from '../../hooks/useLanguageMode';
import { EditorRemoveButton, EditorSectionActions } from '../editor/EditorActions';
import { EditableText } from '../editor/EditableText';
import { createContactDraft } from '../editor/resume-draft-factories';
import { useResumeEditor } from '../editor/ResumeEditorContext';
import { Section } from '../layout/Section';
import { Card } from '../ui/Card';

type ContactSectionProps = {
  links: ContactLink[];
};

export function ContactSection({ links }: ContactSectionProps) {
  const { isEditing, updateResume } = useResumeEditor();
  const { t } = useLanguageMode();

  return (
    <Section id="contact" eyebrow={t('section.contactEyebrow')} title={t('section.contact')} className="bg-white !pb-12 sm:!pb-16">
      <EditorSectionActions
        isEditing={isEditing}
        addLabel={t('editor.addContact')}
        isEmpty={!links.length}
        emptyMessage={t('editor.contactEmpty')}
        onAdd={() =>
          updateResume((draft) => {
            draft.contactLinks.push(createContactDraft());
          })
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {links.map((link, index) => {
          const Icon = getContactIcon(link.type);
          const displayLabel = normalizeContactLabel(link);
          const normalizedHref = normalizeContactHref(link);
          const content = (
            <Card className="group h-full bg-white">
              <div className="flex items-start gap-4">
                <div className="mt-1 inline-flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-[var(--accent)]">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <EditableText
                      value={displayLabel}
                      fieldPath={`contactLinks.${index}.label`}
                      aiEnabled={false}
                      onChange={(value) =>
                        updateResume((draft) => {
                          draft.contactLinks[index].label = value;
                        })
                      }
                      displayAs="p"
                      displayClassName="text-sm font-semibold text-slate-900"
                      inputClassName="text-sm font-semibold text-slate-900"
                    />
                    {isEditing ? (
                      <EditorRemoveButton
                        onRemove={() =>
                          updateResume((draft) => {
                            draft.contactLinks.splice(index, 1);
                          })
                        }
                      />
                    ) : null}
                  </div>
                  <EditableText
                    value={link.value}
                    aiEnabled={false}
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.contactLinks[index].value = value;
                      })
                    }
                    multiline
                    rows={2}
                    displayAs="p"
                    displayClassName="break-words text-sm leading-6 text-slate-600"
                    inputClassName="break-words text-sm leading-6 text-slate-600"
                  />
                  {isEditing ? (
                    <EditableText
                      value={link.href ?? ''}
                      aiEnabled={false}
                      onChange={(value) =>
                        updateResume((draft) => {
                          draft.contactLinks[index].href = value || undefined;
                        })
                      }
                      placeholder={t('editor.placeholderContactHref')}
                      inputClassName="text-sm text-slate-500"
                    />
                  ) : null}
                </div>
                {normalizedHref && !isEditing ? (
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
                ) : null}
              </div>
            </Card>
          );

          if (!normalizedHref || isEditing) {
            return <div key={`contact-${index}`}>{content}</div>;
          }

          return (
            <a
              key={`contact-${index}`}
              href={normalizedHref}
              target={normalizedHref.startsWith('http') ? '_blank' : undefined}
              rel={normalizedHref.startsWith('http') ? 'noreferrer' : undefined}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4"
            >
              {content}
            </a>
          );
        })}
      </div>
    </Section>
  );
}
