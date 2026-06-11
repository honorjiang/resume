import type { EducationItem } from '../../types/resume';
import { useLanguageMode } from '../../hooks/useLanguageMode';
import { EditorRemoveButton, EditorSectionActions } from '../editor/EditorActions';
import { EditableText } from '../editor/EditableText';
import { createEducationDraft } from '../editor/resume-draft-factories';
import { useResumeEditor } from '../editor/ResumeEditorContext';
import { Section } from '../layout/Section';
import { Card } from '../ui/Card';

type EducationSectionProps = {
  items: EducationItem[];
};

export function EducationSection({ items }: EducationSectionProps) {
  const { isEditing, updateResume } = useResumeEditor();
  const { t } = useLanguageMode();

  return (
    <Section id="education" eyebrow={t('section.educationEyebrow')} title={t('section.education')} className="bg-white">
      <EditorSectionActions
        isEditing={isEditing}
        addLabel={t('editor.addEducation')}
        isEmpty={!items.length}
        emptyMessage={t('editor.educationEmpty')}
        onAdd={() =>
          updateResume((draft) => {
            draft.education.push(createEducationDraft());
          })
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <Card key={`education-${index}`} className="h-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <EditableText
                    value={item.school}
                    aiEnabled={false}
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.education[index].school = value;
                      })
                    }
                    displayAs="h3"
                    displayClassName="text-lg font-semibold text-slate-950"
                    inputClassName="text-lg font-semibold text-slate-950"
                  />
                  {isEditing ? (
                    <EditorRemoveButton
                      onRemove={() =>
                        updateResume((draft) => {
                          draft.education.splice(index, 1);
                        })
                      }
                    />
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <EditableText
                    value={item.degree}
                    aiEnabled={false}
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.education[index].degree = value;
                      })
                    }
                    placeholder={t('editor.degreePlaceholder')}
                    displayAs="p"
                    displayClassName="text-sm font-medium text-slate-700"
                    inputClassName="min-w-[8rem] text-sm font-medium text-slate-700"
                  />
                  <EditableText
                    value={item.major ?? ''}
                    fieldPath={`education.${index}.major`}
                    aiEnabled={false}
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.education[index].major = value || undefined;
                      })
                    }
                    placeholder={t('editor.majorPlaceholder')}
                    displayAs="p"
                    displayClassName="text-sm font-medium text-slate-600"
                    inputClassName="min-w-[10rem] text-sm font-medium text-slate-600"
                  />
                </div>
              </div>
              <EditableText
                value={item.period}
                aiEnabled={false}
                onChange={(value) =>
                  updateResume((draft) => {
                    draft.education[index].period = value;
                  })
                }
                displayAs="p"
                displayClassName="text-sm font-medium text-slate-500"
                inputClassName="text-sm font-medium text-slate-500 sm:max-w-[11rem]"
              />
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
