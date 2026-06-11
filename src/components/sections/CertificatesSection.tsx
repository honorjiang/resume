import { motion } from 'framer-motion';
import type { CertificateItem } from '../../types/resume';
import { useLanguageMode } from '../../hooks/useLanguageMode';
import { EditorRemoveButton, EditorSectionActions } from '../editor/EditorActions';
import { EditableText } from '../editor/EditableText';
import { createCertificateDraft } from '../editor/resume-draft-factories';
import { useResumeEditor } from '../editor/ResumeEditorContext';
import { Section } from '../layout/Section';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

type CertificatesSectionProps = {
  items: CertificateItem[];
};

export function CertificatesSection({ items }: CertificatesSectionProps) {
  const { isEditing, updateResume } = useResumeEditor();
  const { t } = useLanguageMode();

  return (
    <Section
      id="certificates"
      eyebrow={t('section.certificatesEyebrow')}
      title={t('section.certificates')}
      className="bg-slate-50/80"
    >
      <EditorSectionActions
        isEditing={isEditing}
        addLabel={t('editor.addCertificate')}
        isEmpty={!items.length}
        emptyMessage={t('editor.certificateEmpty')}
        onAdd={() =>
          updateResume((draft) => {
            draft.certificates.push(createCertificateDraft());
          })
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <motion.div
            key={`certificate-${index}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
          >
            <Card className="h-full">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <EditableText
                      value={item.name}
                      aiEnabled={false}
                      onChange={(value) =>
                        updateResume((draft) => {
                          draft.certificates[index].name = value;
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
                            draft.certificates.splice(index, 1);
                          })
                        }
                      />
                    ) : null}
                  </div>
                  <EditableText
                    value={item.issuer ?? ''}
                    fieldPath={`certificates.${index}.issuer`}
                    aiEnabled={false}
                    onChange={(value) =>
                      updateResume((draft) => {
                        draft.certificates[index].issuer = value || undefined;
                      })
                    }
                    placeholder={t('editor.issuerPlaceholder')}
                    multiline
                    rows={3}
                    displayAs="p"
                    displayClassName="text-sm leading-6 text-slate-600"
                    inputClassName="text-sm leading-6 text-slate-600"
                  />
                </div>
                {!isEditing && item.date ? <Badge>{item.date}</Badge> : null}
              </div>
              <div className="mt-4">
                <EditableText
                  value={item.date ?? ''}
                  aiEnabled={false}
                  onChange={(value) =>
                    updateResume((draft) => {
                      draft.certificates[index].date = value || undefined;
                    })
                  }
                  placeholder={t('editor.datePlaceholder')}
                  inputClassName="max-w-[7rem] text-sm text-slate-700"
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
