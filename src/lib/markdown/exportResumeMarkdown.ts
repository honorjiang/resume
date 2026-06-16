/**
 * 简历 Markdown 导出
 *
 * 将结构化 ResumeProfile 转换为 ATS 友好的纯 Markdown 文本。
 * - 输出当前激活语言的 profile，复用现有语言分隔符约定（中文用「、」，其他语言用「, 」）
 * - 章节顺序固定、层级清晰，便于 ATS 解析与招聘平台表单粘贴
 * - 不引入图片、表格、分栏等 ATS 解析风险
 */

import type {
  CertificateItem,
  ContactLink,
  EducationItem,
  ExperienceItem,
  Highlight,
  ProjectItem,
  ResumeProfile,
  SkillGroup,
} from '../../types/resume';

/** 列表分隔符：中文用「、」，其余语言用「, 」 */
function listSeparator(lang: string): string {
  return lang === 'zh' ? '、' : ', ';
}

function pushLine(lines: string[], text: string) {
  lines.push(text);
}

function pushBlock(lines: string[], text: string) {
  if (text.trim()) {
    lines.push('');
    lines.push(text);
  }
}

/** 空数组 / 空字符串过滤 */
function nonEmpty(value: string | undefined | null): value is string {
  return Boolean(value && value.trim());
}

function trim(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function contactLine(links: ContactLink[], lang: string): string {
  const parts = links
    .map((link) => {
      const value = trim(link.value);
      const href = trim(link.href);
      const label = trim(link.label);
      if (href) {
        const shown = value || href;
        return label ? `${label}: ${shown}` : shown;
      }
      return label ? `${label}: ${value}` : value;
    })
    .filter(nonEmpty);

  if (!parts.length) {
    return '';
  }

  const sep = lang === 'zh' ? ' · ' : ' | ';
  return parts.join(sep);
}

function renderBasics(lines: string[], profile: ResumeProfile, lang: string) {
  const { basics } = profile;

  if (nonEmpty(basics.name)) {
    pushLine(lines, `# ${basics.name}`);
  }

  const titleLine = [trim(basics.title), trim(basics.location)]
    .filter(nonEmpty)
    .join(' · ');
  pushBlock(lines, titleLine);

  const meta = contactLine(profile.contactLinks, lang);
  pushBlock(lines, meta);

  if (nonEmpty(basics.subtitle)) {
    pushLine(lines, '');
    pushLine(lines, `*${basics.subtitle}*`);
  }

  if (nonEmpty(basics.summary)) {
    pushLine(lines, '');
    pushLine(lines, '## ' + (lang === 'zh' ? '个人简介' : 'Summary'));
    pushBlock(lines, trim(basics.summary));
  }
}

function renderHighlights(lines: string[], profile: ResumeProfile, lang: string) {
  if (!profile.highlights.length) {
    return;
  }
  pushLine(lines, '');
  pushLine(lines, '## ' + (lang === 'zh' ? '核心亮点' : 'Highlights'));
  for (const item of profile.highlights as Highlight[]) {
    const parts: string[] = [];
    if (nonEmpty(item.title)) {
      parts.push(`**${item.title}**`);
    }
    if (nonEmpty(item.description)) {
      parts.push(trim(item.description));
    }
    if (nonEmpty(item.metric)) {
      parts.push(`(${trim(item.metric)})`);
    }
    const line = parts.join(' — ').trim();
    if (line) {
      pushLine(lines, `- ${line}`);
    }
  }
}

function renderSkills(lines: string[], profile: ResumeProfile, lang: string) {
  if (!profile.skills.length) {
    return;
  }
  pushLine(lines, '');
  pushLine(lines, '## ' + (lang === 'zh' ? '技能' : 'Skills'));
  const sep = listSeparator(lang);
  for (const group of profile.skills as SkillGroup[]) {
    const items = (group.items ?? []).filter(nonEmpty);
    if (!nonEmpty(group.category)) {
      if (items.length) {
        pushLine(lines, `- ${items.join(sep)}`);
      }
      continue;
    }
    if (items.length) {
      pushLine(lines, `- **${group.category}:** ${items.join(sep)}`);
    } else {
      pushLine(lines, `- **${group.category}**`);
    }
  }
}

function renderExperience(lines: string[], profile: ResumeProfile, lang: string) {
  if (!profile.experience.length) {
    return;
  }
  pushLine(lines, '');
  pushLine(lines, '## ' + (lang === 'zh' ? '工作经历' : 'Professional Experience'));
  for (const item of profile.experience as ExperienceItem[]) {
    const heading = [trim(item.role), trim(item.company)]
      .filter(nonEmpty)
      .join(lang === 'zh' ? ' · ' : ', ');
    const period = nonEmpty(item.period) ? ` (${item.period})` : '';
    pushLine(lines, '');
    pushLine(lines, `### ${heading}${period}`);

    if (nonEmpty(item.location)) {
      pushLine(lines, `*${item.location}*`);
    }
    if (nonEmpty(item.summary)) {
      pushBlock(lines, trim(item.summary));
    }
    for (const achievement of item.achievements ?? []) {
      if (nonEmpty(achievement)) {
        pushLine(lines, `- ${trim(achievement)}`);
      }
    }
  }
}

function renderProjects(lines: string[], profile: ResumeProfile, lang: string) {
  if (!profile.projects.length) {
    return;
  }
  pushLine(lines, '');
  pushLine(lines, '## ' + (lang === 'zh' ? '项目经历' : 'Projects'));
  const sep = listSeparator(lang);
  for (const item of profile.projects as ProjectItem[]) {
    const name = trim(item.name);
    const role = trim(item.role);
    const heading = role ? `${name} · ${role}` : name;
    const period = nonEmpty(item.period) ? ` (${item.period})` : '';
    pushLine(lines, '');
    pushLine(lines, `### ${heading}${period}`);

    if (nonEmpty(item.background)) {
      pushBlock(lines, `*${trim(item.background)}*`);
    }
    if (nonEmpty(item.summary)) {
      pushBlock(lines, trim(item.summary));
    }
    if ((item.actions ?? []).some(nonEmpty)) {
      pushBlock(lines, lang === 'zh' ? '**主要工作：**' : '**What I did:**');
      for (const action of item.actions ?? []) {
        if (nonEmpty(action)) {
          pushLine(lines, `- ${trim(action)}`);
        }
      }
    }
    if ((item.outcomes ?? []).some(nonEmpty)) {
      pushBlock(lines, lang === 'zh' ? '**成果：**' : '**Outcomes:**');
      for (const outcome of item.outcomes ?? []) {
        if (nonEmpty(outcome)) {
          pushLine(lines, `- ${trim(outcome)}`);
        }
      }
    }
    const tags = (item.tags ?? []).filter(nonEmpty);
    if (tags.length) {
      pushBlock(lines, `*${lang === 'zh' ? '技术栈' : 'Tech'}: ${tags.join(sep)}*`);
    }
  }
}

function renderEducation(lines: string[], profile: ResumeProfile, lang: string) {
  if (!profile.education.length) {
    return;
  }
  pushLine(lines, '');
  pushLine(lines, '## ' + (lang === 'zh' ? '教育背景' : 'Education'));
  for (const item of profile.education as EducationItem[]) {
    const heading = [trim(item.degree), trim(item.major)]
      .filter(nonEmpty)
      .join(lang === 'zh' ? '，' : ', ');
    const school = trim(item.school);
    const line = heading ? `${school} — ${heading}` : school;
    const period = nonEmpty(item.period) ? ` (${item.period})` : '';
    pushLine(lines, `- ${line}${period}`);
  }
}

function renderCertificates(lines: string[], profile: ResumeProfile, lang: string) {
  if (!profile.certificates.length) {
    return;
  }
  pushLine(lines, '');
  pushLine(lines, '## ' + (lang === 'zh' ? '证书' : 'Certifications'));
  for (const item of profile.certificates as CertificateItem[]) {
    const issuer = nonEmpty(item.issuer) ? ` — ${item.issuer}` : '';
    const date = nonEmpty(item.date) ? ` (${item.date})` : '';
    pushLine(lines, `- ${trim(item.name)}${issuer}${date}`);
  }
}

/**
 * 将 ResumeProfile 转为 ATS 友好的 Markdown 字符串。
 * @param profile 当前激活语言的简历数据
 * @param lang    当前语言代码（决定章节标题、分隔符）
 */
export function exportResumeMarkdown(profile: ResumeProfile, lang: string): string {
  const lines: string[] = [];

  renderBasics(lines, profile, lang);
  renderHighlights(lines, profile, lang);
  renderSkills(lines, profile, lang);
  renderExperience(lines, profile, lang);
  renderProjects(lines, profile, lang);
  renderEducation(lines, profile, lang);
  renderCertificates(lines, profile, lang);

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** 推荐文件名：{姓名}_{语言}.md，非法字符替换为下划线 */
export function buildMarkdownFileName(profile: ResumeProfile, lang: string): string {
  const name = trim(profile.basics.name);
  const base =
    (name || 'resume')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 40) || 'resume';
  const suffix = lang === 'zh' ? '' : `_${lang}`;
  return `${base}${suffix}.md`;
}
