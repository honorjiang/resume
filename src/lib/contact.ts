import type { ContactLink } from '../types/resume';

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const URL_LIKE_PATTERN = /^(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i;

export function normalizeContactLabel(link: ContactLink) {
  if (link.type === 'phone' && !link.label) {
    return '手机';
  }

  return link.label;
}

function normalizeUrlLikeValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function inferContactType(link: ContactLink) {
  const value = link.value.trim();
  const href = link.href?.trim() ?? '';

  if (href.toLowerCase().startsWith('mailto:') || EMAIL_PATTERN.test(value)) {
    return 'email' as const;
  }

  if (link.type === 'phone') {
    return 'phone' as const;
  }

  if (link.type === 'url' || URL_LIKE_PATTERN.test(value) || URL_LIKE_PATTERN.test(href)) {
    return 'url' as const;
  }

  return link.type;
}

export function normalizeContactHref(link: ContactLink) {
  const value = link.value.trim();
  const href = link.href?.trim();
  const type = inferContactType(link);

  if (type === 'email') {
    return value ? `mailto:${value}` : undefined;
  }

  if (type === 'phone') {
    return href || undefined;
  }

  if (type === 'url') {
    return normalizeUrlLikeValue(href || value);
  }

  return href || undefined;
}

export function normalizeContactLink(link: ContactLink): ContactLink {
  const type = inferContactType(link);

  return {
    ...link,
    type,
    href: normalizeContactHref(link),
  };
}
