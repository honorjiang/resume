import type { SkillGroup } from '../../types/resume';
import { EditorRemoveButton, EditorSectionActions } from '../editor/EditorActions';
import { EditableText } from '../editor/EditableText';
import { formatCommaList, parseCommaList } from '../editor/list-format';
import { createSkillGroupDraft } from '../editor/resume-draft-factories';
import { useResumeEditor } from '../editor/ResumeEditorContext';
import { Section } from '../layout/Section';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

type SkillsSectionProps = {
  items: SkillGroup[];
};

export function SkillsSection({ items }: SkillsSectionProps) {
  const { isEditing, updateResume, getAiEditedState } = useResumeEditor();

  return (
    <Section id="skills" eyebrow="技能" title="技能矩阵" className="bg-white">
      <EditorSectionActions
        isEditing={isEditing}
        addLabel="新增技能卡片"
        isEmpty={!items.length}
        emptyMessage="当前没有技能卡片，先新增一项。"
        onAdd={() =>
          updateResume((draft) => {
            draft.skills.push(createSkillGroupDraft());
          })
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((group, index) => (
          <Card key={group.category || index} className="h-full">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <EditableText
                  value={group.category}
                  onChange={(value) =>
                    updateResume((draft) => {
                      draft.skills[index].category = value;
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
                        draft.skills.splice(index, 1);
                      })
                    }
                  />
                ) : null}
              </div>

              {isEditing ? (
                <EditableText
                  value={formatCommaList(group.items)}
                  fieldPath={`skills.${index}.items`}
                  fieldPathPrefix
                  onChange={(value) =>
                    updateResume((draft) => {
                      draft.skills[index].items = parseCommaList(value);
                    })
                  }
                  multiline
                  rows={4}
                  placeholder="使用逗号分隔技能项"
                  inputClassName="text-sm text-slate-700"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item, itemIndex) => (
                    <span
                      key={`${item}-${itemIndex}`}
                      className={
                        getAiEditedState(`skills.${index}.items.${itemIndex}`, item)
                          .isAiEdited
                          ? 'resume-ai-edited-chip rounded-full'
                          : undefined
                      }
                    >
                      <Badge>{item}</Badge>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
