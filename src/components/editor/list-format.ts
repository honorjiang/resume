export function parseLineList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatLineList(items: string[] | undefined) {
  return (items ?? []).join('\n');
}

export function parseCommaList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatCommaList(items: string[] | undefined) {
  return (items ?? []).join(', ');
}
