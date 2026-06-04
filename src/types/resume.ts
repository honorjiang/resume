export interface ResumeProfile {
  basics: BasicInfo;
  highlights: Highlight[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: SkillGroup[];
  education: EducationItem[];
  certificates: CertificateItem[];
  contactLinks: ContactLink[];
}

export interface BasicInfo {
  name: string;
  title: string;
  subtitle: string;
  summary: string;
  intent?: string;
  location?: string;
  avatarUrl?: string;
  focusTags: string[];
}

export interface Highlight {
  title: string;
  description: string;
  metric?: string;
  icon?: string;
}

export interface ExperienceItem {
  id?: string;
  company: string;
  role: string;
  period: string;
  location?: string;
  summary?: string;
  achievements: string[];
  tags?: string[];
  relatedProjectIds?: string[];
}

export interface ProjectItem {
  id?: string;
  name: string;
  role: string;
  period?: string;
  summary?: string;
  background: string;
  actions: string[];
  outcomes: string[];
  tags?: string[];
  featured?: boolean;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  major?: string;
  period: string;
}

export interface CertificateItem {
  name: string;
  issuer?: string;
  date?: string;
}

export interface ContactLink {
  label: string;
  value: string;
  href?: string;
  type?: 'email' | 'phone' | 'url' | 'text';
}
