import type {
  CertificateItem,
  ContactLink,
  EducationItem,
  ExperienceItem,
  Highlight,
  ProjectItem,
  SkillGroup,
} from '../../types/resume';

function createDraftId(prefix: string) {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `${prefix}-${randomId}`;
}

export function createHighlightDraft(): Highlight {
  return {
    metric: '',
    title: '新增亮点',
    description: '',
    icon: 'workflow',
  };
}

export function createSkillGroupDraft(): SkillGroup {
  return {
    category: '新增技能组',
    items: [],
  };
}

export function createExperienceDraft(): ExperienceItem {
  return {
    id: createDraftId('experience'),
    company: '新增公司',
    role: '新增职位',
    period: '',
    location: '',
    summary: '',
    achievements: [],
    tags: [],
    relatedProjectIds: [],
  };
}

export function createProjectDraft(featured: boolean): ProjectItem {
  return {
    id: createDraftId('project'),
    name: '新增项目',
    role: '项目角色',
    period: '',
    summary: '',
    background: '',
    actions: [],
    outcomes: [],
    tags: [],
    featured,
  };
}

export function createEducationDraft(): EducationItem {
  return {
    school: '新增院校',
    degree: '新增学历',
    major: '',
    period: '',
  };
}

export function createCertificateDraft(): CertificateItem {
  return {
    name: '新增证书',
    issuer: '',
    date: '',
  };
}

export function createContactDraft(): ContactLink {
  return {
    label: '新增联系方式',
    value: '',
    href: '',
    type: 'text',
  };
}
