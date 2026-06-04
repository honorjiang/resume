import { normalizeContactLink } from '../contact';
import type { ResumeProfile } from '../../types/resume';
import type { ResumeDraft } from '../../types/resume-import';

const HIGHLIGHT_ICON_CYCLE = ['workflow', 'chart', 'network', 'layers'] as const;
const PRESENT_PERIOD_PATTERN = /至今|现在|当前|present|now|current/i;

type NormalizedProject = ResumeProfile['projects'][number] & {
  id: string;
};

type PeriodRange = {
  start: number;
  end: number;
};

function buildHighlights(draft: ResumeDraft) {
  if (draft.highlights?.length) {
    return draft.highlights;
  }

  return (draft.experience ?? []).slice(0, 3).map((item) => ({
    title: item.role || item.company,
    description:
      item.summary || item.achievements[0] || `${item.company} ${item.period}`,
    metric: item.period,
  }));
}

function buildFocusTags(draft: ResumeDraft) {
  const fromSkills =
    draft.skills
      ?.flatMap((group) => [group.category, ...group.items])
      .filter((value) => value.length > 1)
      .slice(0, 4) ?? [];

  return [...new Set(fromSkills)].slice(0, 4);
}

function normalizeKey(value: string | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function createSlug(value: string | undefined, fallbackPrefix: string, index: number) {
  const normalized = (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `${fallbackPrefix}-${index + 1}`;
}

function toMonthIndex(year: number, month = 1) {
  return year * 12 + month - 1;
}

function parseDateLike(value: string | undefined) {
  const normalized = (value ?? '').trim();
  const matched = normalized.match(/(19\d{2}|20\d{2})(?:\D{0,3}(0?[1-9]|1[0-2]))?/);

  if (!matched) {
    return null;
  }

  return toMonthIndex(Number(matched[1]), matched[2] ? Number(matched[2]) : 1);
}

function currentMonthIndex() {
  const now = new Date();
  return toMonthIndex(now.getFullYear(), now.getMonth() + 1);
}

function parsePeriodRange(period: string | undefined): PeriodRange | null {
  const normalized = (period ?? '').trim();

  if (!normalized) {
    return null;
  }

  const dateMatches = Array.from(
    normalized.matchAll(/(19\d{2}|20\d{2})(?:\D{0,3}(0?[1-9]|1[0-2]))?/g),
  );

  if (!dateMatches.length) {
    return null;
  }

  const start = parseDateLike(dateMatches[0][0]);
  const end = PRESENT_PERIOD_PATTERN.test(normalized)
    ? currentMonthIndex()
    : parseDateLike(dateMatches[1]?.[0]) ?? start;

  if (start === null || end === null) {
    return null;
  }

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function calculateOverlap(left: PeriodRange | null, right: PeriodRange | null) {
  if (!left || !right) {
    return 0;
  }

  return Math.max(0, Math.min(left.end, right.end) - Math.max(left.start, right.start) + 1);
}

function appendUniqueProjectId(projectIds: string[], projectId: string) {
  if (!projectIds.includes(projectId)) {
    projectIds.push(projectId);
  }
}

function inferRelatedProjectIds(
  project: NormalizedProject,
  experience: ResumeProfile['experience'],
) {
  if (!experience.length) {
    return null;
  }

  if (experience.length === 1) {
    return 0;
  }

  const projectRange = parsePeriodRange(project.period);

  if (!projectRange) {
    return null;
  }

  const scoredMatches = experience
    .map((item, index) => ({
      index,
      overlap: calculateOverlap(projectRange, parsePeriodRange(item.period)),
    }))
    .filter((match) => match.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap);

  if (!scoredMatches.length) {
    return null;
  }

  const [bestMatch, secondMatch] = scoredMatches;

  return !secondMatch || bestMatch.overlap > secondMatch.overlap
    ? bestMatch.index
    : null;
}

function normalizeImportedResumeProfile(
  profile: ResumeProfile,
  fallback: ResumeProfile,
): ResumeProfile {
  const usedProjectIds = new Set<string>();
  const projectRefMap = new Map<string, string>();
  const fallbackHighlightIconMap = new Map(
    fallback.highlights.map((item) => [normalizeKey(item.title), item.icon]),
  );

  const projects = profile.projects.map((item, index) => {
    let projectId = item.id?.trim() || createSlug(item.name, 'project', index);

    while (usedProjectIds.has(projectId)) {
      projectId = `${projectId}-${index + 1}`;
    }

    usedProjectIds.add(projectId);
    projectRefMap.set(normalizeKey(projectId), projectId);
    projectRefMap.set(normalizeKey(item.name), projectId);

    return {
      ...item,
      id: projectId,
      featured: index % 2 === 0,
    };
  });

  const highlights = profile.highlights.map((item, index) => ({
    ...item,
    icon:
      fallbackHighlightIconMap.get(normalizeKey(item.title)) ??
      HIGHLIGHT_ICON_CYCLE[index % HIGHLIGHT_ICON_CYCLE.length],
  }));

  const experience = profile.experience.map((item, index) => {
    const normalizedRelatedProjectIds = (item.relatedProjectIds ?? [])
      .map((projectRef) => projectRefMap.get(normalizeKey(projectRef)) ?? '')
      .filter((projectId, projectIndex, projectIds) => {
        return (
          projectId.length > 0 && projectIds.indexOf(projectId) === projectIndex
        );
      });

    return {
      ...item,
      id: item.id?.trim() || createSlug(`${item.company}-${item.role}`, 'experience', index),
      relatedProjectIds: normalizedRelatedProjectIds.length
        ? normalizedRelatedProjectIds
        : undefined,
    };
  });

  projects.forEach((project) => {
    const isAlreadyRelated = experience.some((item) =>
      item.relatedProjectIds?.includes(project.id),
    );

    if (isAlreadyRelated) {
      return;
    }

    const inferredExperienceIndex = inferRelatedProjectIds(project, experience);

    if (inferredExperienceIndex === null) {
      return;
    }

    const relatedProjectIds = experience[inferredExperienceIndex].relatedProjectIds ?? [];
    appendUniqueProjectId(relatedProjectIds, project.id);
    experience[inferredExperienceIndex].relatedProjectIds = relatedProjectIds;
  });

  const contactLinks = profile.contactLinks.map((item) => ({
    ...normalizeContactLink(item),
    label: item.type === 'phone' ? '手机' : item.label,
  }));

  return {
    ...profile,
    highlights,
    experience,
    projects,
    contactLinks,
  };
}

export function draftToResumeProfile(
  draft: ResumeDraft,
  fallback: ResumeProfile,
): ResumeProfile {
  const basics = draft.basics ?? {};
  const focusTags = buildFocusTags(draft);

  const profile = {
    basics: {
      name: basics.name || fallback.basics.name,
      title: basics.title || fallback.basics.title,
      subtitle: basics.subtitle || '',
      summary: basics.summary || '',
      location: basics.location,
      avatarUrl: basics.avatarUrl,
      focusTags,
    },
    highlights: buildHighlights(draft),
    experience: draft.experience ?? [],
    projects: draft.projects ?? [],
    skills: draft.skills ?? [],
    education: draft.education ?? [],
    certificates: draft.certificates ?? [],
    contactLinks: draft.contactLinks ?? [],
  };

  return normalizeImportedResumeProfile(profile, fallback);
}
