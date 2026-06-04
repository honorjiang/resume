import type { ResumeProfile } from '../../types/resume';

export type ResumeTextEntry = {
  path: string;
  value: string;
};

export function normalizeComparableText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function pushEntry(entries: ResumeTextEntry[], path: string, value?: string) {
  if (typeof value !== 'string') {
    return;
  }

  const normalizedValue = normalizeComparableText(value);

  if (!normalizedValue) {
    return;
  }

  entries.push({
    path,
    value: normalizedValue,
  });
}

export function flattenResumeTextEntries(resume: ResumeProfile) {
  const entries: ResumeTextEntry[] = [];

  pushEntry(entries, 'basics.name', resume.basics.name);
  pushEntry(entries, 'basics.title', resume.basics.title);
  pushEntry(entries, 'basics.subtitle', resume.basics.subtitle);
  pushEntry(entries, 'basics.summary', resume.basics.summary);
  pushEntry(entries, 'basics.intent', resume.basics.intent);
  pushEntry(entries, 'basics.location', resume.basics.location);

  resume.highlights.forEach((item, index) => {
    pushEntry(entries, `highlights.${index}.metric`, item.metric);
    pushEntry(entries, `highlights.${index}.title`, item.title);
    pushEntry(entries, `highlights.${index}.description`, item.description);
  });

  resume.experience.forEach((item, index) => {
    pushEntry(entries, `experience.${index}.company`, item.company);
    pushEntry(entries, `experience.${index}.role`, item.role);
    pushEntry(entries, `experience.${index}.period`, item.period);
    pushEntry(entries, `experience.${index}.location`, item.location);
    pushEntry(entries, `experience.${index}.summary`, item.summary);
    item.achievements.forEach((achievement, achievementIndex) => {
      pushEntry(
        entries,
        `experience.${index}.achievements.${achievementIndex}`,
        achievement,
      );
    });
  });

  resume.projects.forEach((item, index) => {
    pushEntry(entries, `projects.${index}.name`, item.name);
    pushEntry(entries, `projects.${index}.role`, item.role);
    pushEntry(entries, `projects.${index}.period`, item.period);
    pushEntry(entries, `projects.${index}.summary`, item.summary);
    pushEntry(entries, `projects.${index}.background`, item.background);
    item.actions.forEach((action, actionIndex) => {
      pushEntry(entries, `projects.${index}.actions.${actionIndex}`, action);
    });
    item.outcomes.forEach((outcome, outcomeIndex) => {
      pushEntry(entries, `projects.${index}.outcomes.${outcomeIndex}`, outcome);
    });
  });

  resume.skills.forEach((group, index) => {
    pushEntry(entries, `skills.${index}.category`, group.category);
    group.items.forEach((item, itemIndex) => {
      pushEntry(entries, `skills.${index}.items.${itemIndex}`, item);
    });
  });

  resume.education.forEach((item, index) => {
    pushEntry(entries, `education.${index}.school`, item.school);
    pushEntry(entries, `education.${index}.degree`, item.degree);
    pushEntry(entries, `education.${index}.major`, item.major);
    pushEntry(entries, `education.${index}.period`, item.period);
  });

  resume.certificates.forEach((item, index) => {
    pushEntry(entries, `certificates.${index}.name`, item.name);
    pushEntry(entries, `certificates.${index}.issuer`, item.issuer);
    pushEntry(entries, `certificates.${index}.date`, item.date);
  });

  resume.contactLinks.forEach((item, index) => {
    pushEntry(entries, `contactLinks.${index}.label`, item.label);
    pushEntry(entries, `contactLinks.${index}.value`, item.value);
  });

  return entries;
}

export function getResumeTextValueByPath(
  resume: ResumeProfile,
  path: string,
): string | undefined {
  const segments = path.split('.');
  let current: unknown = resume;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);

      if (!Number.isInteger(index)) {
        return undefined;
      }

      current = current[index];
      continue;
    }

    if (typeof current !== 'object' || current === null) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : undefined;
}
