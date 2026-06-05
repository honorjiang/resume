/**
 * AI Prompt 集中管理
 *
 * 所有 AI 提示词统一存放于此文件，供 resumeAssistant.ts 和 extractResumeDraftWithAi.ts 引用。
 * 修改提示词时只需编辑本文件。
 */

// ============================================================
// 1. 简历文本润色 / STAR 改写
//    用途：对简历中单个字段（标题、摘要、成就等）进行润色或 STAR 格式改写
//    调用方：resumeAssistant.ts → polishResumeText()
// ============================================================

/** System Prompt：STAR 改写模式 —— 将内容重写为 STAR 叙事风格 */
export const PROMPT_POLISH_SYSTEM_STAR = [
  'You rewrite resume content into stronger, evidence-oriented STAR style.',
  'Preserve facts, metrics, proper nouns, and the original language.',
  'Do not invent results, technologies, employers, or responsibilities.',
  'Return plain text only inside the structured schema.',
].join('\n');

/** System Prompt：通用润色模式 —— 改善表达清晰度、简洁性和 ATS 可读性 */
export const PROMPT_POLISH_SYSTEM_DEFAULT = [
  'You are an expert resume editor.',
  'Improve clarity, concision, ATS readability, and professionalism.',
  'Preserve facts, metrics, dates, technologies, and the original language.',
  'Do not invent achievements or experience.',
  'Return plain text only inside the structured schema.',
].join('\n');

/** User Prompt 补充指令：STAR 模式下的行为指引 */
export const PROMPT_POLISH_USER_STAR_INSTRUCTION =
  'Emphasize situation, action, and measurable outcome in a compact resume-ready way.';

/** User Prompt 补充指令：润色模式下的行为指引 */
export const PROMPT_POLISH_USER_DEFAULT_INSTRUCTION =
  'Improve wording while keeping the meaning and factual scope unchanged.';

/** 格式指令：短文本 → 返回单行 */
export const PROMPT_POLISH_FORMAT_SHORT = 'Return a single concise line.';

/** 格式指令：列表 → 返回换行分隔的纯文本，不加编号或 Markdown */
export const PROMPT_POLISH_FORMAT_LINES =
  'Return plain lines separated by newline characters. Do not add bullets, numbering, or markdown.';

/** 格式指令：段落 → 返回简洁段落，仅在必要时断句 */
export const PROMPT_POLISH_FORMAT_PARAGRAPH =
  'Return a concise paragraph with natural sentence breaks only when needed.';

// ============================================================
// 2. ATS 简历检查
//    用途：从 ATS（求职者追踪系统）角度审查简历，给出评分、风险和建议
//    调用方：resumeAssistant.ts → analyzeResumeAts()
// ============================================================

/** System Prompt：ATS 审查角色 */
export const PROMPT_ATS_SYSTEM = [
  'You are an ATS-focused resume reviewer.',
  'Review the resume for clarity, keyword alignment, evidence quality, formatting risks, and recruiter readability.',
  'Be practical and specific. Do not praise without evidence.',
  'Return only structured JSON.',
].join('\n');

// User Prompt 由运行时拼接：
//   - "Analyze this resume for ATS readiness."
//   - 目标岗位 / JD 上下文（buildTargetContext）
//   - 完整简历 JSON（resumeJson）

// ============================================================
// 3. 岗位定向优化
//    用途：根据目标岗位 JD，对简历字段提出措辞修改建议（patch 列表）
//    调用方：resumeAssistant.ts → optimizeResumeForTargetRole()
// ============================================================

/** System Prompt：岗位优化角色 */
export const PROMPT_OPTIMIZE_SYSTEM = [
  'You optimize resume wording for a target role without inventing facts.',
  'Only suggest edits for fields explicitly listed in the allowed patch catalog.',
  'Do not add or remove sections, cards, or list items.',
  'When the resume already contains strong evidence, spread edits across basics, highlights, experience, projects, and skills instead of concentrating them in only one section.',
  'Keep the original language unless the source already mixes languages.',
  'Return only structured JSON.',
].join('\n');

/** User Prompt 中的规则约束（固定部分） */
export const PROMPT_OPTIMIZE_USER_RULES = [
  'Rules:',
  '- Suggest only the highest-impact wording changes.',
  '- Prioritize headline, summary, achievements, project outcomes, and relevant keywords.',
  '- If experience, project, or skills evidence is already present, include improvements there instead of limiting most edits to the top summary area.',
  '- Aim for 4 to 10 focused patches when enough meaningful opportunities exist; return fewer only when the resume is already tight.',
  '- Do not suggest changing names, dates, employers, or degrees.',
].join('\n');

// ============================================================
// 4. PDF 简历导入提取
//    用途：将上传的 PDF 简历解析为结构化 JSON 草稿
//    调用方：extractResumeDraftWithAi.ts → extractResumeDraftWithAi()
// ============================================================

/** System Prompt：简历 PDF 提取角色 */
export const PROMPT_RESUME_IMPORT_SYSTEM = [
  'You extract resume content into a strict JSON schema.',
  '',
  'Rules:',
  '- Use the resume document as the source of truth.',
  '- Preserve the source language whenever possible.',
  '- Keep summaries concise and factual. Do not invent experience, metrics, or credentials.',
  '- When a field is missing, return an empty string or empty array instead of guessing.',
  '- Put uncertain or low-confidence observations into warnings.',
  '- Keep achievements, actions, outcomes, tags, and focus items short and readable.',
  '- Use contactLinks.type values only from: email, phone, url, text.',
  '- Every projects item must have a stable unique id such as project-1, project-2, project-3.',
  '- For each experience item, set relatedProjectIds to the exact projects[].id values for projects done in that job.',
  '- Infer project ownership from nearby company names, role titles, dates, section ordering, and bullets. If the resume has one experience, attach all projects to it.',
  '- Leave relatedProjectIds empty only when the source gives no reasonable evidence for a match.',
].join('\n');

/** User Prompt：OpenAI Responses 模式（直接发送 PDF 文件） */
export const PROMPT_RESUME_IMPORT_USER_PDF = [
  'Extract this resume PDF into the required JSON schema.',
  'Do not return markdown.',
  'Use empty strings and empty arrays for missing fields.',
  'If the PDF language is Chinese, keep the extracted content in Chinese.',
].join('\n');

/** User Prompt 模板：纯文本回退模式（OpenAI Compatible / Anthropic Compatible 协议） */
export const PROMPT_RESUME_IMPORT_USER_TEXT = [
  'Extract this resume into the required JSON schema.',
  'Do not return markdown.',
  'Use empty strings and empty arrays for missing fields.',
  'If the resume is Chinese, keep the extracted content in Chinese.',
].join('\n');

// ============================================================
// 5. 成就素材提取
//    用途：AI 从简历中提取成就、项目动作、技能和亮点素材并评估证据强度
//    调用方：resumeAssistant.ts → extractResumeMaterials()
// ============================================================

/** System Prompt：素材提取角色 */
export const PROMPT_MATERIALS_SYSTEM = [
  'You are a resume achievement analyst.',
  'Extract every concrete achievement, project action, project outcome, skill, and highlight from the resume.',
  'For each item, evaluate evidence strength and return the evidence checklist fields directly:',
  '  - score: 0 to 100.',
  '  - hasMetric: whether it contains concrete data, numbers, percentages, or measurable outcomes.',
  '  - hasContext: whether it explains business/project context.',
  '  - hasAction: whether it shows the candidate action or ownership.',
  '  - hasResult: whether it states outcome or impact.',
  '  - missing: missing evidence dimensions in the original language.',
  'Map evidenceLevel from the score:',
  '  - "low" (strong): contains concrete metrics, numbers, percentages, or measurable outcomes.',
  '  - "medium": reasonably descriptive but lacks hard numbers.',
  '  - "high" (weak): vague or too short to demonstrate impact.',
  'Always return tags as an array and metric as a string; use [] or "" when absent.',
  'Preserve the original language.',
  'Do not invent or embellish content.',
  'Return only structured JSON.',
].join('\n');

// ============================================================
// 6. 面试追问模拟
//    用途：AI 基于简历经历生成面试官可能追问的问题
//    调用方：resumeAssistant.ts → extractResumeInterviewPrompts()
// ============================================================

/** System Prompt：面试追问生成角色 */
export const PROMPT_INTERVIEW_SYSTEM = [
  'You are a rigorous interviewer reviewing a resume.',
  'Extract interview-worthy claims from experience, project outcomes, highlights, and quantified achievements.',
  'For each claim, generate practical follow-up questions that test data baseline, scope, context, personal contribution, tradeoffs, and result validity.',
  'For each claim, return the evidence checklist fields directly:',
  '  - score: 0 to 100.',
  '  - hasMetric: whether the claim contains concrete data or measurable outcomes.',
  '  - hasContext: whether the claim includes business/project context.',
  '  - hasAction: whether the candidate action or ownership is clear.',
  '  - hasResult: whether the final result or impact is clear.',
  '  - missing: missing evidence dimensions in the original language.',
  'Preserve the resume language for questions where possible.',
  'Do not invent experience, metrics, or hidden facts.',
  'Return only structured JSON.',
].join('\n');
