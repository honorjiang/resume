/**
 * AI 语言指令生成器
 *
 * 为所有 AI 调用生成统一的语言输出指令。
 * 中文（master）走中文指令，其他语言走英文指令 + 目标语言名称。
 */

const LANG_NAMES: Record<string, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  ru: 'Русский',
  ar: 'العربية',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  nl: 'Nederlands',
  pl: 'Polski',
  tr: 'Türkçe',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  cs: 'Čeština',
  hu: 'Magyar',
  ro: 'Română',
  uk: 'Українська',
  hi: 'हिन्दी',
  bn: 'বাংলা',
};

export function getLanguageName(lang: string): string {
  return LANG_NAMES[lang] ?? lang;
}

export function languageDirective(lang: string): string {
  if (lang === 'zh') {
    return '输出语言：中文。所有 AI 生成的文本必须是中文。';
  }
  const name = getLanguageName(lang);
  return `Output language: ${name}. All AI-generated text must be in ${name}.`;
}
