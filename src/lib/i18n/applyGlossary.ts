/**
 * 渲染时词库翻译（兜底）
 *
 * 与 AI 全局翻译（translateResumeProfile）配合使用：
 *   - AI 翻译成功 → profile 写入 localStorage → 渲染直接使用
 *   - AI 未触发 / 翻译失败 → 渲染前对 activeResume 走本函数（仅 en 有词库）
 *
 * 关键约束（不破坏用户约束）：
 *   - 整段命中词库 → 译出
 *   - 整段切分后**每个片段**都能命中 → 拼接译出
 *   - 任一片段未命中 → 整段回退原文（绝不出现"半中半英"）
 */

import { zhEnGlossary } from './glossary';
import type { ResumeProfile } from '../../types/resume';

// 分隔符保留型切分：分隔符单独成 token，方便"片段命中、分隔符原样"拼接
const SPLIT_PATTERN = /([，。、；：\s,.!?;:()（）/／—-])/;

/**
 * 单文本兜底翻译（仅 en 有词库）
 */
export function applyGlossary(text: string | undefined | null, lang: string): string {
  if (!text) return '';
  if (lang !== 'en') return text;

  // 1) 整段查表
  if (zhEnGlossary[text] !== undefined) {
    return zhEnGlossary[text];
  }

  // 2) 整段查不到，尝试按分隔符切分
  //    条件：**所有非空片段**都必须在词库中（不允许任何一个未命中 → 否则整段回退）
  const tokens = text.split(SPLIT_PATTERN);
  const allTranslated = tokens.every(
    (tok) => tok === '' || !tok.trim() || zhEnGlossary[tok] !== undefined,
  );

  if (allTranslated) {
    return tokens
      .map((tok) => (zhEnGlossary[tok] !== undefined ? zhEnGlossary[tok] : tok))
      .join('');
  }

  // 3) 不允许"半中半英" → 整段回退原文
  return text;
}

/**
 * 整份 Profile 递归装饰：对每个 string 字段过一遍 applyGlossary（仅 en）
 */
export function applyGlossaryToProfile(
  profile: ResumeProfile,
  lang: string,
): ResumeProfile {
  if (lang !== 'en') return profile;
  return walk(profile) as ResumeProfile;
}

function walk(value: unknown): unknown {
  if (typeof value === 'string') {
    return applyGlossary(value, 'en');
  }
  if (Array.isArray(value)) {
    return value.map((entry) => walk(entry));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = walk(v);
    }
    return result;
  }
  return value;
}
