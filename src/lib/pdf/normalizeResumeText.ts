export function normalizeResumeText(rawText: string) {
  return rawText
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2022\u25cf\u25aa\u25e6]/g, '-')
    .replace(/[\uFF5C|]/g, ' | ')
    .replace(/[\u3000\t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}
