import type { ReactNode } from 'react';
import { CertificatesSection } from '../sections/CertificatesSection';
import { ContactSection } from '../sections/ContactSection';
import { EducationSection } from '../sections/EducationSection';
import { ExperienceSection } from '../sections/ExperienceSection';
import { HeroSection } from '../sections/HeroSection';
import { HighlightsSection } from '../sections/HighlightsSection';
import { SkillsSection } from '../sections/SkillsSection';
import type { ResumeProfile } from '../../types/resume';

type ResumeDocumentProps = {
  resume: ResumeProfile;
  isEditing: boolean;
};

function PdfSection({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  if (!enabled) {
    return null;
  }

  return <div data-pdf-section="true">{children}</div>;
}

export function ResumeDocument({
  resume,
  isEditing,
}: ResumeDocumentProps) {
  return (
    <>
      <PdfSection enabled>
        <HeroSection basics={resume.basics} />
      </PdfSection>
      <PdfSection enabled={isEditing || resume.highlights.length > 0}>
        <HighlightsSection items={resume.highlights} />
      </PdfSection>
      <PdfSection enabled={isEditing || resume.skills.length > 0}>
        <SkillsSection items={resume.skills} />
      </PdfSection>
      <PdfSection enabled={isEditing || resume.experience.length > 0}>
        <ExperienceSection items={resume.experience} projects={resume.projects} />
      </PdfSection>
      <PdfSection enabled={isEditing || resume.education.length > 0}>
        <EducationSection items={resume.education} />
      </PdfSection>
      <PdfSection enabled={isEditing || resume.certificates.length > 0}>
        <CertificatesSection items={resume.certificates} />
      </PdfSection>
      <PdfSection enabled>
        <ContactSection links={resume.contactLinks} />
      </PdfSection>
    </>
  );
}
