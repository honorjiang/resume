import type {
  BasicInfo,
  CertificateItem,
  ContactLink,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  ResumeProfile,
  SkillGroup,
} from './resume';

export interface ResumeDraft {
  rawText: string;
  warnings: string[];
  basics?: Partial<BasicInfo>;
  highlights?: ResumeProfile['highlights'];
  experience?: ExperienceItem[];
  projects?: ProjectItem[];
  skills?: SkillGroup[];
  education?: EducationItem[];
  certificates?: CertificateItem[];
  contactLinks?: ContactLink[];
  extractedSections: Partial<Record<ResumeSectionKey, string[]>>;
}

export type ResumeSectionKey =
  | 'basics'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'education'
  | 'certificates'
  | 'contact';

export type ResumeImportStatus =
  | 'idle'
  | 'extracting'
  | 'parsing'
  | 'ready'
  | 'error';

export type ResumeImportProvider =
  | 'openai-responses'
  | 'openai-compatible'
  | 'anthropic-compatible';

export interface ResumeImportAiConfig {
  provider: ResumeImportProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface ResumeImportReview {
  file: File;
  draft: ResumeDraft;
  resume: ResumeProfile;
  meta: {
    model: string;
    usedLocalTextPreview: boolean;
  };
}
