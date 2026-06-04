import type { EducationItem } from '../../types/resume';
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

  return (
    <Section id="education" eyebrow="教育" title="教育背景" className="bg-white">
      <EditorSectionActions
        isEditing={isEditing}
        addLabel="新增教育卡片"
        isEmpty={!items.length}
        emptyMessage="当前没有教育卡片，先新增一项。"
        onAdd={() =>
          updateResume((draft) => {
            draft.education.push(createEducationDraft());
          })
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <Card key={`${item.school}-${item.period}-${index}`} className="h-full">
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
                    placeholder="学历"
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
                    placeholder="专业"
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
