import {
  PROMPT_POLISH_SYSTEM_STAR,
  PROMPT_POLISH_SYSTEM_DEFAULT,
  PROMPT_POLISH_USER_STAR_INSTRUCTION,
  PROMPT_POLISH_USER_DEFAULT_INSTRUCTION,
  PROMPT_POLISH_FORMAT_SHORT,
  PROMPT_POLISH_FORMAT_LINES,
  PROMPT_POLISH_FORMAT_PARAGRAPH,
  PROMPT_ATS_SYSTEM,
  PROMPT_OPTIMIZE_SYSTEM,
  PROMPT_OPTIMIZE_USER_RULES,
  PROMPT_MATERIALS_SYSTEM,
  PROMPT_INTERVIEW_SYSTEM,
} from './prompts';
import type { ResumeProfile } from '../../types/resume';
import type { ResumeImportAiConfig, ResumeImportProvider } from '../../types/resume-import';
import type {
  ResumeAtsCheckRequest,
  ResumeAtsReport,
  ResumeAtsRisk,
  ResumeAtsRiskLevel,
  ResumeAtsSuggestion,
  ResumeAiTextRequest,
  ResumeAiTextRewriteResult,
  ResumeJobOptimizationRequest,
  ResumeOptimizationPatch,
  ResumeOptimizationResult,
} from '../../types/resume-ai';
import type {
  ResumeEvidenceScore,
  ResumeMaterialCategory,
  ResumeMaterialItem,
  ResumeInterviewPrompt,
} from '../../types/resume-workbench';

type OpenAiErrorResponse = {
  error?: {
    message?: string;
  };
};

type OpenAiResponsesResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      refusal?: string;
    }>;
  }>;
};

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      tool_calls?: Array<{
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
};

type AnthropicCompatibleResponse = {
  content?: Array<{
    type?: string;
    name?: string;
    input?: unknown;
  }>;
};

type StructuredAiRequest = {
  config: ResumeImportAiConfig;
  operationLabel: string;
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
};

type OptimizationCandidate = {
  path: string;
  label: string;
  currentValue: string;
};

const TEXT_REWRITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rewrittenText', 'notes'],
  properties: {
    rewrittenText: { type: 'string' },
    notes: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

const ATS_REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'overallScore',
    'summary',
    'strengths',
    'missingKeywords',
    'risks',
    'suggestions',
  ],
  properties: {
    overallScore: { type: 'number' },
    summary: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'string' },
    },
    missingKeywords: {
      type: 'array',
      items: { type: 'string' },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'section', 'severity', 'detail'],
        properties: {
          title: { type: 'string' },
          section: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          detail: { type: 'string' },
        },
      },
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'priority', 'detail'],
        properties: {
          title: { type: 'string' },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          detail: { type: 'string' },
        },
      },
    },
  },
} as const;

const OPTIMIZATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'targetRole', 'keywordCoverage', 'warnings', 'patches'],
  properties: {
    summary: { type: 'string' },
    targetRole: { type: 'string' },
    keywordCoverage: {
      type: 'array',
      items: { type: 'string' },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
    patches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'label', 'currentValue', 'suggestedValue', 'reason'],
        properties: {
          path: { type: 'string' },
          label: { type: 'string' },
          currentValue: { type: 'string' },
          suggestedValue: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
} as const;

const CONNECTION_TEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'message'],
  properties: {
    ok: { type: 'boolean' },
    message: { type: 'string' },
  },
} as const;

const EVIDENCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'hasMetric', 'hasContext', 'hasAction', 'hasResult', 'missing'],
  properties: {
    score: { type: 'number' },
    hasMetric: { type: 'boolean' },
    hasContext: { type: 'boolean' },
    hasAction: { type: 'boolean' },
    hasResult: { type: 'boolean' },
    missing: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

const MATERIALS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['materials'],
  properties: {
    materials: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'category',
          'sourceLabel',
          'title',
          'content',
          'path',
          'tags',
          'metric',
          'evidenceLevel',
          'evidence',
        ],
        properties: {
          id: { type: 'string' },
          category: {
            type: 'string',
            enum: ['achievement', 'project', 'skill', 'highlight'],
          },
          sourceLabel: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          path: { type: 'string' },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          metric: { type: 'string' },
          evidenceLevel: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          evidence: EVIDENCE_SCHEMA,
        },
      },
    },
  },
} as const;

const INTERVIEW_PROMPTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['prompts'],
  properties: {
    prompts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'sourceLabel', 'sourceText', 'questions', 'evidence'],
        properties: {
          id: { type: 'string' },
          sourceLabel: { type: 'string' },
          sourceText: { type: 'string' },
          questions: {
            type: 'array',
            items: { type: 'string' },
          },
          evidence: EVIDENCE_SCHEMA,
        },
      },
    },
  },
} as const;

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => cleanText(entry))
    .filter((entry, index, list) => entry.length > 0 && list.indexOf(entry) === index);
}

function normalizeSeverity(value: unknown): ResumeAtsRiskLevel {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium';
}

function normalizeEvidenceScore(value: unknown): ResumeEvidenceScore {
  const source = value && typeof value === 'object' ? value : {};
  const rawScore = Number((source as { score?: unknown }).score);

  return {
    score: Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : 0,
    hasMetric: Boolean((source as { hasMetric?: unknown }).hasMetric),
    hasContext: Boolean((source as { hasContext?: unknown }).hasContext),
    hasAction: Boolean((source as { hasAction?: unknown }).hasAction),
    hasResult: Boolean((source as { hasResult?: unknown }).hasResult),
    missing: cleanStringArray((source as { missing?: unknown }).missing),
  };
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

function buildOpenAiResponsesUrl(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith('/v1')
    ? `${normalized}/responses`
    : `${normalized}/v1/responses`;
}

function buildOpenAiCompatibleUrl(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith('/v1')
    ? `${normalized}/chat/completions`
    : `${normalized}/v1/chat/completions`;
}

function buildAnthropicCompatibleUrl(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith('/v1')
    ? `${normalized}/messages`
    : `${normalized}/v1/messages`;
}

async function readJsonSafely(response: Response) {
  try {
    return (await response.json()) as
      | OpenAiErrorResponse
      | OpenAiResponsesResponse
      | OpenAiCompatibleResponse
      | AnthropicCompatibleResponse;
  } catch {
    return null;
  }
}

function buildFunctionTool(schemaName: string, schema: Record<string, unknown>) {
  return {
    type: 'function' as const,
    function: {
      name: schemaName,
      description: 'Return the structured response payload.',
      parameters: schema,
    },
  };
}

function buildAnthropicTool(schemaName: string, schema: Record<string, unknown>) {
  return {
    name: schemaName,
    description: 'Return the structured response payload.',
    input_schema: schema,
  };
}

async function requestViaOpenAiResponses<T>({
  config,
  operationLabel,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  maxOutputTokens = 2500,
}: StructuredAiRequest): Promise<T> {
  const response = await fetch(buildOpenAiResponsesUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim(),
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userPrompt }],
        },
      ],
      max_output_tokens: maxOutputTokens,
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorPayload = await readJsonSafely(response);
    const errorMessage =
      errorPayload && 'error' in errorPayload
        ? cleanText(errorPayload.error?.message)
        : '';

    throw new Error(
      errorMessage
        ? `${operationLabel}失败：${errorMessage}`
        : `${operationLabel}失败：HTTP ${response.status}`,
    );
  }

  const payload = (await readJsonSafely(response)) as OpenAiResponsesResponse | null;
  const refusalMessage =
    payload?.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === 'refusal' && item.refusal)?.refusal ?? '';

  if (refusalMessage) {
    throw new Error(`AI 拒绝处理当前请求：${refusalMessage}`);
  }

  const outputText = cleanText(payload?.output_text);

  if (!outputText) {
    throw new Error(`${operationLabel}失败：未返回结构化结果。`);
  }

  try {
    return JSON.parse(outputText) as T;
  } catch {
    throw new Error(`${operationLabel}失败：返回结果不是合法 JSON。`);
  }
}

async function requestViaOpenAiCompatible<T>({
  config,
  operationLabel,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
}: StructuredAiRequest): Promise<T> {
  const response = await fetch(buildOpenAiCompatibleUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim(),
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      tools: [buildFunctionTool(schemaName, schema)],
      tool_choice: {
        type: 'function',
        function: {
          name: schemaName,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorPayload = await readJsonSafely(response);
    const errorMessage =
      errorPayload && 'error' in errorPayload
        ? cleanText(errorPayload.error?.message)
        : '';

    throw new Error(
      errorMessage
        ? `${operationLabel}失败：${errorMessage}`
        : `${operationLabel}失败：HTTP ${response.status}`,
    );
  }

  const payload = (await readJsonSafely(response)) as OpenAiCompatibleResponse | null;
  const toolCall = payload?.choices?.[0]?.message?.tool_calls?.find(
    (item) => item.function?.name === schemaName,
  );
  const argumentsText = cleanText(toolCall?.function?.arguments);

  if (!argumentsText) {
    throw new Error(`${operationLabel}失败：未返回工具结果。`);
  }

  try {
    return JSON.parse(argumentsText) as T;
  } catch {
    throw new Error(`${operationLabel}失败：工具返回参数不是合法 JSON。`);
  }
}

async function requestViaAnthropicCompatible<T>({
  config,
  operationLabel,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  maxOutputTokens = 2500,
}: StructuredAiRequest): Promise<T> {
  const response = await fetch(buildAnthropicCompatibleUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model.trim(),
      max_tokens: maxOutputTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      tools: [buildAnthropicTool(schemaName, schema)],
      tool_choice: {
        type: 'tool',
        name: schemaName,
      },
    }),
  });

  if (!response.ok) {
    const errorPayload = await readJsonSafely(response);
    const errorMessage =
      errorPayload && 'error' in errorPayload
        ? cleanText(errorPayload.error?.message)
        : '';

    throw new Error(
      errorMessage
        ? `${operationLabel}失败：${errorMessage}`
        : `${operationLabel}失败：HTTP ${response.status}`,
    );
  }

  const payload = (await readJsonSafely(response)) as AnthropicCompatibleResponse | null;
  const toolUse = payload?.content?.find(
    (item) => item.type === 'tool_use' && item.name === schemaName,
  );

  if (!toolUse?.input) {
    throw new Error(`${operationLabel}失败：未返回工具结果。`);
  }

  return toolUse.input as T;
}

async function requestStructuredAi<T>(
  provider: ResumeImportProvider,
  request: StructuredAiRequest,
) {
  switch (provider) {
    case 'openai-compatible':
      return requestViaOpenAiCompatible<T>(request);
    case 'anthropic-compatible':
      return requestViaAnthropicCompatible<T>(request);
    default:
      return requestViaOpenAiResponses<T>(request);
  }
}

function serializeResumeForAi(resume: ResumeProfile) {
  return JSON.stringify(
    {
      basics: resume.basics,
      highlights: resume.highlights,
      experience: resume.experience.map((item) => ({
        company: item.company,
        role: item.role,
        period: item.period,
        location: item.location,
        summary: item.summary,
        achievements: item.achievements,
        tags: item.tags,
      })),
      projects: resume.projects.map((item) => ({
        name: item.name,
        role: item.role,
        period: item.period,
        summary: item.summary,
        background: item.background,
        actions: item.actions,
        outcomes: item.outcomes,
        tags: item.tags,
      })),
      skills: resume.skills,
      education: resume.education,
      certificates: resume.certificates,
      contactLinks: resume.contactLinks,
    },
    null,
    2,
  );
}

function normalizeTextRewriteResult(payload: unknown): ResumeAiTextRewriteResult {
  const source = payload && typeof payload === 'object' ? payload : {};
  const rewrittenText = cleanText((source as { rewrittenText?: unknown }).rewrittenText);

  if (!rewrittenText) {
    throw new Error('AI 未返回可用的改写内容。');
  }

  return {
    rewrittenText,
    notes: cleanStringArray((source as { notes?: unknown }).notes),
  };
}

function normalizeAtsRisks(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ResumeAtsRisk[];
  }

  return value
    .map((entry) => {
      const source = entry && typeof entry === 'object' ? entry : {};
      const title = cleanText((source as { title?: unknown }).title);
      const section = cleanText((source as { section?: unknown }).section);
      const detail = cleanText((source as { detail?: unknown }).detail);

      if (!title || !detail) {
        return null;
      }

      return {
        title,
        section: section || 'Resume',
        severity: normalizeSeverity((source as { severity?: unknown }).severity),
        detail,
      } satisfies ResumeAtsRisk;
    })
    .filter((entry): entry is ResumeAtsRisk => Boolean(entry));
}

function normalizeAtsSuggestions(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ResumeAtsSuggestion[];
  }

  return value
    .map((entry) => {
      const source = entry && typeof entry === 'object' ? entry : {};
      const title = cleanText((source as { title?: unknown }).title);
      const detail = cleanText((source as { detail?: unknown }).detail);

      if (!title || !detail) {
        return null;
      }

      return {
        title,
        detail,
        priority: normalizeSeverity((source as { priority?: unknown }).priority),
      } satisfies ResumeAtsSuggestion;
    })
    .filter((entry): entry is ResumeAtsSuggestion => Boolean(entry));
}

function normalizeAtsReport(payload: unknown): ResumeAtsReport {
  const source = payload && typeof payload === 'object' ? payload : {};
  const scoreValue = Number((source as { overallScore?: unknown }).overallScore);

  return {
    overallScore: Number.isFinite(scoreValue)
      ? Math.max(0, Math.min(100, Math.round(scoreValue)))
      : 0,
    summary: cleanText((source as { summary?: unknown }).summary),
    strengths: cleanStringArray((source as { strengths?: unknown }).strengths),
    missingKeywords: cleanStringArray(
      (source as { missingKeywords?: unknown }).missingKeywords,
    ),
    risks: normalizeAtsRisks((source as { risks?: unknown }).risks),
    suggestions: normalizeAtsSuggestions(
      (source as { suggestions?: unknown }).suggestions,
    ),
  };
}

function buildOptimizationCandidates(resume: ResumeProfile) {
  const candidates: OptimizationCandidate[] = [];

  const addCandidate = (path: string, label: string, currentValue?: string | null) => {
    const normalized = cleanText(currentValue);
    if (!normalized) {
      return;
    }

    candidates.push({
      path,
      label,
      currentValue: normalized,
    });
  };

  addCandidate('basics.title', 'Headline', resume.basics.title);
  addCandidate('basics.subtitle', 'Positioning line', resume.basics.subtitle);
  addCandidate('basics.summary', 'Summary', resume.basics.summary);
  addCandidate('basics.intent', 'Target intent', resume.basics.intent);

  resume.highlights.forEach((item, index) => {
    addCandidate(`highlights.${index}.title`, `Highlight ${index + 1} title`, item.title);
    addCandidate(
      `highlights.${index}.description`,
      `Highlight ${index + 1} description`,
      item.description,
    );
    addCandidate(
      `highlights.${index}.metric`,
      `Highlight ${index + 1} metric`,
      item.metric,
    );
  });

  resume.experience.forEach((item, index) => {
    addCandidate(`experience.${index}.role`, `Experience ${index + 1} role`, item.role);
    addCandidate(
      `experience.${index}.summary`,
      `Experience ${index + 1} summary`,
      item.summary,
    );
    item.achievements.forEach((achievement, achievementIndex) => {
      addCandidate(
        `experience.${index}.achievements.${achievementIndex}`,
        `Experience ${index + 1} achievement ${achievementIndex + 1}`,
        achievement,
      );
    });
  });

  resume.projects.forEach((item, index) => {
    addCandidate(`projects.${index}.role`, `Project ${index + 1} role`, item.role);
    addCandidate(`projects.${index}.summary`, `Project ${index + 1} summary`, item.summary);
    addCandidate(
      `projects.${index}.background`,
      `Project ${index + 1} background`,
      item.background,
    );
    item.actions.forEach((action, actionIndex) => {
      addCandidate(
        `projects.${index}.actions.${actionIndex}`,
        `Project ${index + 1} action ${actionIndex + 1}`,
        action,
      );
    });
    item.outcomes.forEach((outcome, outcomeIndex) => {
      addCandidate(
        `projects.${index}.outcomes.${outcomeIndex}`,
        `Project ${index + 1} outcome ${outcomeIndex + 1}`,
        outcome,
      );
    });
  });

  resume.skills.forEach((group, index) => {
    group.items.forEach((item, itemIndex) => {
      addCandidate(
        `skills.${index}.items.${itemIndex}`,
        `Skill ${group.category || index + 1} item ${itemIndex + 1}`,
        item,
      );
    });
  });

  return candidates;
}

function normalizeOptimizationPatches(
  payload: unknown,
  allowedPatches: Map<string, OptimizationCandidate>,
): ResumeOptimizationResult {
  const source = payload && typeof payload === 'object' ? payload : {};
  const rawPatches = Array.isArray((source as { patches?: unknown }).patches)
    ? ((source as { patches?: unknown[] }).patches ?? [])
    : [];

  const patches = rawPatches
    .map((entry) => {
      const patch = entry && typeof entry === 'object' ? entry : {};
      const path = cleanText((patch as { path?: unknown }).path);
      const suggestedValue = cleanText((patch as { suggestedValue?: unknown }).suggestedValue);
      const reason = cleanText((patch as { reason?: unknown }).reason);
      const allowed = allowedPatches.get(path);

      if (!allowed || !suggestedValue || suggestedValue === allowed.currentValue) {
        return null;
      }

      return {
        path,
        label: cleanText((patch as { label?: unknown }).label) || allowed.label,
        currentValue: allowed.currentValue,
        suggestedValue,
        reason: reason || 'Improve relevance for the target role.',
      } satisfies ResumeOptimizationPatch;
    })
    .filter((entry): entry is ResumeOptimizationPatch => Boolean(entry));

  return {
    summary: cleanText((source as { summary?: unknown }).summary),
    targetRole: cleanText((source as { targetRole?: unknown }).targetRole),
    keywordCoverage: cleanStringArray(
      (source as { keywordCoverage?: unknown }).keywordCoverage,
    ),
    warnings: cleanStringArray((source as { warnings?: unknown }).warnings),
    patches,
  };
}

function buildTargetContext(targetRole?: string, jobDescription?: string) {
  return [
    targetRole ? `Target role: ${targetRole.trim()}` : '',
    jobDescription?.trim()
      ? `Job description or requirement notes:\n${jobDescription.trim()}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function polishResumeText({
  config,
  action,
  value,
  sectionLabel = 'Resume',
  fieldLabel = 'Field',
  contextHint = '',
  format = 'paragraph',
}: ResumeAiTextRequest) {
  const operationLabel = action === 'star' ? 'STAR 改写' : 'AI 润色';
  const systemPrompt = action === 'star' ? PROMPT_POLISH_SYSTEM_STAR : PROMPT_POLISH_SYSTEM_DEFAULT;

  const formatInstruction =
    format === 'short'
      ? PROMPT_POLISH_FORMAT_SHORT
      : format === 'lines'
        ? PROMPT_POLISH_FORMAT_LINES
        : PROMPT_POLISH_FORMAT_PARAGRAPH;

  const userPrompt = [
    `Task: ${operationLabel}`,
    `Section: ${sectionLabel}`,
    `Field: ${fieldLabel}`,
    `Format: ${format}`,
    contextHint ? `Context: ${contextHint}` : '',
    '',
    formatInstruction,
    action === 'star' ? PROMPT_POLISH_USER_STAR_INSTRUCTION : PROMPT_POLISH_USER_DEFAULT_INSTRUCTION,
    '',
    'Current text:',
    value.trim(),
  ]
    .filter(Boolean)
    .join('\n');

  const payload = await requestStructuredAi<ResumeAiTextRewriteResult>(config.provider, {
    config,
    operationLabel,
    schemaName: action === 'star' ? 'rewrite_star_text' : 'polish_resume_text',
    schema: TEXT_REWRITE_SCHEMA as unknown as Record<string, unknown>,
    systemPrompt,
    userPrompt,
    maxOutputTokens: 1800,
  });

  return normalizeTextRewriteResult(payload);
}

export async function analyzeResumeAts({
  config,
  resumeJson,
  targetRole,
  jobDescription,
}: ResumeAtsCheckRequest) {
  const systemPrompt = PROMPT_ATS_SYSTEM;

  const userPrompt = [
    'Analyze this resume for ATS readiness.',
    buildTargetContext(targetRole, jobDescription),
    '',
    'Resume JSON:',
    resumeJson,
  ]
    .filter(Boolean)
    .join('\n');

  const payload = await requestStructuredAi<ResumeAtsReport>(config.provider, {
    config,
    operationLabel: 'ATS 检查',
    schemaName: 'resume_ats_report',
    schema: ATS_REPORT_SCHEMA as unknown as Record<string, unknown>,
    systemPrompt,
    userPrompt,
    maxOutputTokens: 3000,
  });

  return normalizeAtsReport(payload);
}

export async function optimizeResumeForTargetRole({
  config,
  resumeJson,
  targetRole,
  jobDescription,
  allowedPatchesJson,
}: ResumeJobOptimizationRequest) {
  const systemPrompt = PROMPT_OPTIMIZE_SYSTEM;

  const userPrompt = [
    'Optimize this resume for the target role.',
    buildTargetContext(targetRole, jobDescription),
    '',
    PROMPT_OPTIMIZE_USER_RULES,
    '',
    'Resume JSON:',
    resumeJson,
    '',
    'Allowed patch catalog JSON:',
    allowedPatchesJson,
  ]
    .filter(Boolean)
    .join('\n');

  const payload = await requestStructuredAi<ResumeOptimizationResult>(config.provider, {
    config,
    operationLabel: '岗位定向优化',
    schemaName: 'resume_job_optimization',
    schema: OPTIMIZATION_SCHEMA as unknown as Record<string, unknown>,
    systemPrompt,
    userPrompt,
    maxOutputTokens: 3500,
  });

  return normalizeOptimizationPatches(
    payload,
    new Map(
      (JSON.parse(allowedPatchesJson) as OptimizationCandidate[]).map((item) => [
        item.path,
        item,
      ]),
    ),
  );
}

export function buildResumeAiSnapshot(resume: ResumeProfile) {
  return serializeResumeForAi(resume);
}

export function buildResumeOptimizationCatalog(resume: ResumeProfile) {
  return buildOptimizationCandidates(resume);
}

export async function testResumeAiConnection(config: ResumeImportAiConfig) {
  const payload = await requestStructuredAi<{
    ok?: unknown;
    message?: unknown;
  }>(config.provider, {
    config,
    operationLabel: 'AI 连接测试',
    schemaName: 'resume_connection_test',
    schema: CONNECTION_TEST_SCHEMA as unknown as Record<string, unknown>,
    systemPrompt: [
      'You validate that the structured JSON connection works.',
      'Return ok=true and a short message. Do not request or infer any user data.',
    ].join('\n'),
    userPrompt: 'Return a minimal successful connection check response.',
    maxOutputTokens: 120,
  });

  return {
    ok: Boolean(payload.ok),
    message: cleanText(payload.message) || '连接测试完成。',
  };
}

export async function extractResumeMaterials({
  config,
  resumeJson,
}: {
  config: ResumeImportAiConfig;
  resumeJson: string;
}): Promise<ResumeMaterialItem[]> {
  const userPrompt = [
    'Extract all achievement materials, project actions/outcomes, skills, and highlights from this resume.',
    'For each item, set evidenceLevel based on whether it contains measurable metrics.',
    '',
    'Resume JSON:',
    resumeJson,
  ].join('\n');

  const payload = await requestStructuredAi<{ materials: unknown[] }>(config.provider, {
    config,
    operationLabel: '素材提取',
    schemaName: 'resume_materials',
    schema: MATERIALS_SCHEMA as unknown as Record<string, unknown>,
    systemPrompt: PROMPT_MATERIALS_SYSTEM,
    userPrompt,
    maxOutputTokens: 4000,
  });

  return normalizeMaterials(payload);
}

type RawMaterialItem = {
  id?: unknown;
  category?: unknown;
  sourceLabel?: unknown;
  title?: unknown;
  content?: unknown;
  path?: unknown;
  tags?: unknown;
  metric?: unknown;
  evidenceLevel?: unknown;
  evidence?: unknown;
};

type RawInterviewPrompt = {
  id?: unknown;
  sourceLabel?: unknown;
  sourceText?: unknown;
  questions?: unknown;
  evidence?: unknown;
};

function normalizeMaterials(payload: unknown): ResumeMaterialItem[] {
  const source = payload && typeof payload === 'object' ? payload : {};
  const rawItems = Array.isArray((source as { materials?: unknown }).materials)
    ? (source as { materials: RawMaterialItem[] }).materials
    : [];

  return rawItems
    .map((item, index) => {
      const content = cleanText(item.content);
      if (!content) return null;

      const category = item.category;
      const validCategory: ResumeMaterialCategory =
        category === 'achievement' || category === 'project' || category === 'skill' || category === 'highlight'
          ? category
          : 'highlight';

      const evidenceLevel = item.evidenceLevel;
      const validLevel: ResumeAtsRiskLevel =
        evidenceLevel === 'high' || evidenceLevel === 'medium' || evidenceLevel === 'low'
          ? evidenceLevel
          : 'medium';

      return {
        id: cleanText(item.id) || `material-${index}`,
        category: validCategory,
        sourceLabel: cleanText(item.sourceLabel),
        title: cleanText(item.title),
        content,
        path: cleanText(item.path) || `unknown.${index}`,
        tags: cleanStringArray(item.tags),
        metric: cleanText(item.metric) || undefined,
        evidenceLevel: validLevel,
        evidence: normalizeEvidenceScore(item.evidence),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function extractResumeInterviewPrompts({
  config,
  resumeJson,
}: {
  config: ResumeImportAiConfig;
  resumeJson: string;
}): Promise<ResumeInterviewPrompt[]> {
  const userPrompt = [
    'Generate interview follow-up prompts from this resume.',
    'Focus on claims in experience, project outcomes, highlights, and quantified achievements.',
    'Return only claims that are useful for interview validation.',
    '',
    'Resume JSON:',
    resumeJson,
  ].join('\n');

  const payload = await requestStructuredAi<{ prompts: unknown[] }>(config.provider, {
    config,
    operationLabel: '面试追问提取',
    schemaName: 'resume_interview_prompts',
    schema: INTERVIEW_PROMPTS_SCHEMA as unknown as Record<string, unknown>,
    systemPrompt: PROMPT_INTERVIEW_SYSTEM,
    userPrompt,
    maxOutputTokens: 4000,
  });

  return normalizeInterviewPrompts(payload);
}

function normalizeInterviewPrompts(payload: unknown): ResumeInterviewPrompt[] {
  const source = payload && typeof payload === 'object' ? payload : {};
  const rawItems = Array.isArray((source as { prompts?: unknown }).prompts)
    ? (source as { prompts: RawInterviewPrompt[] }).prompts
    : [];

  return rawItems
    .map((item, index) => {
      const sourceText = cleanText(item.sourceText);
      const questions = cleanStringArray(item.questions);

      if (!sourceText || !questions.length) {
        return null;
      }

      return {
        id: cleanText(item.id) || `interview-${index}`,
        sourceLabel: cleanText(item.sourceLabel) || '简历经历',
        sourceText,
        questions,
        evidence: normalizeEvidenceScore(item.evidence),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function applyOptimizationPatches(
  resume: ResumeProfile,
  patches: ResumeOptimizationPatch[],
) {
  for (const patch of patches) {
    const segments = patch.path.split('.');
    let cursor: unknown = resume;

    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      if (Array.isArray(cursor)) {
        const arrayIndex = Number(segment);
        cursor = Number.isInteger(arrayIndex) ? cursor[arrayIndex] : undefined;
      } else if (cursor && typeof cursor === 'object') {
        cursor = (cursor as Record<string, unknown>)[segment];
      } else {
        cursor = undefined;
      }

      if (cursor == null) {
        break;
      }
    }

    const lastSegment = segments.at(-1);
    if (!lastSegment || cursor == null) {
      continue;
    }

    if (Array.isArray(cursor)) {
      const arrayIndex = Number(lastSegment);
      if (Number.isInteger(arrayIndex) && arrayIndex >= 0 && arrayIndex < cursor.length) {
        cursor[arrayIndex] = patch.suggestedValue;
      }
      continue;
    }

    if (cursor && typeof cursor === 'object') {
      (cursor as Record<string, unknown>)[lastSegment] = patch.suggestedValue;
    }
  }
}
