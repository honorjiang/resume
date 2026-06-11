import {
  PROMPT_RESUME_IMPORT_SYSTEM,
  PROMPT_RESUME_IMPORT_USER_PDF,
  PROMPT_RESUME_IMPORT_USER_TEXT,
} from '../ai/prompts';
import type { Language } from '../i18n/uiDict';
import { languageDirective } from '../i18n/languageDirective';
import type {
  ResumeDraft,
  ResumeImportAiConfig,
  ResumeImportProvider,
} from '../../types/resume-import';

type AiResumePayload = {
  warnings?: unknown;
  basics?: Record<string, unknown>;
  highlights?: unknown;
  experience?: unknown;
  projects?: unknown;
  skills?: unknown;
  education?: unknown;
  certificates?: unknown;
  contactLinks?: unknown;
};

type ResumeContactType = 'email' | 'phone' | 'url' | 'text';

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
      content?: string | null;
      tool_calls?: Array<{
        type?: string;
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
    text?: string;
  }>;
};

const LOCAL_TEXT_LIMIT = 12_000;

const RESUME_IMPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'warnings',
    'basics',
    'highlights',
    'experience',
    'projects',
    'skills',
    'education',
    'certificates',
    'contactLinks',
  ],
  properties: {
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
    basics: {
      type: 'object',
      additionalProperties: false,
      required: [
        'name',
        'title',
        'subtitle',
        'summary',
        'intent',
        'location',
      ],
      properties: {
        name: { type: 'string' },
        title: { type: 'string' },
        subtitle: { type: 'string' },
        summary: { type: 'string' },
        intent: { type: 'string' },
        location: { type: 'string' },
      },
    },
    highlights: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'metric'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          metric: { type: 'string' },
        },
      },
    },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'company',
          'role',
          'period',
          'location',
          'summary',
          'achievements',
          'tags',
          'relatedProjectIds',
        ],
        properties: {
          company: { type: 'string' },
          role: { type: 'string' },
          period: { type: 'string' },
          location: { type: 'string' },
          summary: { type: 'string' },
          achievements: {
            type: 'array',
            items: { type: 'string' },
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          relatedProjectIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'name',
          'role',
          'period',
          'summary',
          'background',
          'actions',
          'outcomes',
          'tags',
          'featured',
        ],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          period: { type: 'string' },
          summary: { type: 'string' },
          background: { type: 'string' },
          actions: {
            type: 'array',
            items: { type: 'string' },
          },
          outcomes: {
            type: 'array',
            items: { type: 'string' },
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          featured: { type: 'boolean' },
        },
      },
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'items'],
        properties: {
          category: { type: 'string' },
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['school', 'degree', 'major', 'period'],
        properties: {
          school: { type: 'string' },
          degree: { type: 'string' },
          major: { type: 'string' },
          period: { type: 'string' },
        },
      },
    },
    certificates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'issuer', 'date'],
        properties: {
          name: { type: 'string' },
          issuer: { type: 'string' },
          date: { type: 'string' },
        },
      },
    },
    contactLinks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value', 'href', 'type'],
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          href: { type: 'string' },
          type: {
            type: 'string',
            enum: ['email', 'phone', 'url', 'text'],
          },
        },
      },
    },
  },
} as const;

const AI_SYSTEM_PROMPT = PROMPT_RESUME_IMPORT_SYSTEM;

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanOptionalText(value: unknown) {
  const normalized = cleanText(value);
  return normalized || undefined;
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => cleanText(entry))
    .filter((entry, index, list) => entry.length > 0 && list.indexOf(entry) === index);
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

function normalizeContactType(value: unknown): ResumeContactType | undefined {
  const normalized = cleanText(value);

  if (
    normalized === 'email' ||
    normalized === 'phone' ||
    normalized === 'url' ||
    normalized === 'text'
  ) {
    return normalized;
  }

  return undefined;
}

function buildDraft(payload: AiResumePayload, rawText: string): ResumeDraft {
  const basics = payload.basics ?? {};

  return {
    rawText,
    warnings: cleanStringArray(payload.warnings),
    basics: {
      name: cleanOptionalText(basics.name),
      title: cleanOptionalText(basics.title),
      subtitle: cleanOptionalText(basics.subtitle),
      summary: cleanOptionalText(basics.summary),
      intent: cleanOptionalText(basics.intent),
      location: cleanOptionalText(basics.location),
    },
    highlights: Array.isArray(payload.highlights)
      ? payload.highlights
          .map((item) => {
            const source =
              item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
            const title = cleanText(source.title);
            const description = cleanText(source.description);
            const metric = cleanOptionalText(source.metric);

            if (!title || !description) {
              return null;
            }

            return { title, description, metric };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [],
    experience: Array.isArray(payload.experience)
      ? payload.experience
          .map((item) => {
            const source =
              item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
            const company = cleanText(source.company);
            const role = cleanText(source.role);
            const period = cleanText(source.period);

            if (!company || !role || !period) {
              return null;
            }

            return {
              company,
              role,
              period,
              location: cleanOptionalText(source.location),
              summary: cleanOptionalText(source.summary),
              achievements: cleanStringArray(source.achievements),
              tags: cleanStringArray(source.tags),
              relatedProjectIds: cleanStringArray(source.relatedProjectIds),
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [],
    projects: Array.isArray(payload.projects)
      ? payload.projects
          .map((item) => {
            const source =
              item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
            const name = cleanText(source.name);
            const role = cleanText(source.role);
            const background = cleanText(source.background);

            if (!name || !role || !background) {
              return null;
            }

            return {
              id: cleanOptionalText(source.id),
              name,
              role,
              period: cleanOptionalText(source.period),
              summary: cleanOptionalText(source.summary),
              background,
              actions: cleanStringArray(source.actions),
              outcomes: cleanStringArray(source.outcomes),
              tags: cleanStringArray(source.tags),
              featured: Boolean(source.featured),
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [],
    skills: Array.isArray(payload.skills)
      ? payload.skills
          .map((item) => {
            const source =
              item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
            const category = cleanText(source.category);
            const items = cleanStringArray(source.items);

            if (!category || items.length === 0) {
              return null;
            }

            return { category, items };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [],
    education: Array.isArray(payload.education)
      ? payload.education
          .map((item) => {
            const source =
              item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
            const school = cleanText(source.school);
            const degree = cleanText(source.degree);
            const period = cleanText(source.period);

            if (!school || !degree || !period) {
              return null;
            }

            return {
              school,
              degree,
              major: cleanOptionalText(source.major),
              period,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [],
    certificates: Array.isArray(payload.certificates)
      ? payload.certificates
          .map((item) => {
            const source =
              item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
            const name = cleanText(source.name);

            if (!name) {
              return null;
            }

            return {
              name,
              issuer: cleanOptionalText(source.issuer),
              date: cleanOptionalText(source.date),
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [],
    contactLinks: Array.isArray(payload.contactLinks)
      ? payload.contactLinks
          .map((item) => {
            const source =
              item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
            const label = cleanText(source.label);
            const value = cleanText(source.value);

            if (!label || !value) {
              return null;
            }

            return {
              label,
              value,
              href: cleanOptionalText(source.href),
              type: normalizeContactType(source.type),
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [],
    extractedSections: {},
  };
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

function buildTextOnlyPrompt(rawText: string) {
  return [
    PROMPT_RESUME_IMPORT_USER_TEXT,
    '',
    'Resume plaintext:',
    rawText.slice(0, LOCAL_TEXT_LIMIT),
  ].join('\n');
}

function buildFunctionTool() {
  return {
    type: 'function' as const,
    function: {
      name: 'submit_resume',
      description: 'Return the structured resume payload.',
      parameters: RESUME_IMPORT_SCHEMA,
    },
  };
}

function buildAnthropicTool() {
  return {
    name: 'submit_resume',
    description: 'Return the structured resume payload.',
    input_schema: RESUME_IMPORT_SCHEMA,
  };
}

function parseResumePayload(payload: unknown, rawText: string) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI 未返回结构化简历数据。');
  }

  return buildDraft(payload as AiResumePayload, rawText);
}

/**
 * Try to extract a JSON object from the model output.
 * Handles: plain JSON, markdown code fences (```json ... ```), leading/trailing text.
 */
function extractJsonFromOutput(text: string): unknown {
  // 1. Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  // 2. Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {
      // continue
    }
  }

  // 3. Find first { ... last } and try to parse that substring
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      // continue
    }
  }

  return null;
}

async function requestViaOpenAiResponses(
  config: ResumeImportAiConfig,
  file: File,
  fileData: string,
  rawText: string,
  outputLanguage: Language,
  signal?: AbortSignal,
) {
  const systemPrompt = `${AI_SYSTEM_PROMPT}\n\n${languageDirective(outputLanguage)}`;
  const response = await fetch(buildOpenAiResponsesUrl(config.baseUrl), {
    method: 'POST',
    signal,
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
          content: [
            {
              type: 'input_file',
              filename: file.name,
              file_data: fileData,
            },
            {
              type: 'input_text',
              text: PROMPT_RESUME_IMPORT_USER_PDF,
            },
            ...(rawText
              ? [
                  {
                    type: 'input_text',
                    text: `Supplemental plaintext extracted locally (may be incomplete):\n${rawText.slice(0, LOCAL_TEXT_LIMIT)}`,
                  },
                ]
              : []),
          ],
        },
      ],
      max_output_tokens: 16000,
      text: {
        format: {
          type: 'json_schema',
          name: 'resume_import',
          strict: true,
          schema: RESUME_IMPORT_SCHEMA,
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
        ? `AI 提取失败：${errorMessage}`
        : `AI 提取失败：HTTP ${response.status}`,
    );
  }

  const payload = (await readJsonSafely(response)) as OpenAiResponsesResponse | null;

  const refusalMessage =
    payload?.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === 'refusal' && item.refusal)?.refusal ?? '';

  if (refusalMessage) {
    throw new Error(`AI 拒绝处理该 PDF：${refusalMessage}`);
  }

  const outputText = cleanText(payload?.output_text);

  if (!outputText) {
    throw new Error('AI 未返回结构化简历数据。');
  }

  const parsed = extractJsonFromOutput(outputText);

  if (!parsed || typeof parsed !== 'object') {
    const preview = outputText.length > 200 ? outputText.slice(0, 200) + '…' : outputText;
    throw new Error(
      `AI 返回的简历数据不是合法 JSON。\n\n返回内容预览：${preview}`,
    );
  }

  return parseResumePayload(parsed, rawText);
}

async function requestViaOpenAiCompatible(
  config: ResumeImportAiConfig,
  rawText: string,
  outputLanguage: Language,
  signal?: AbortSignal,
) {
  const systemPrompt = `${AI_SYSTEM_PROMPT}\n\n${languageDirective(outputLanguage)}`;
  const response = await fetch(buildOpenAiCompatibleUrl(config.baseUrl), {
    method: 'POST',
    signal,
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
          content: buildTextOnlyPrompt(rawText),
        },
      ],
      tools: [buildFunctionTool()],
      tool_choice: {
        type: 'function',
        function: {
          name: 'submit_resume',
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
        ? `OpenAI 兼容协议调用失败：${errorMessage}`
        : `OpenAI 兼容协议调用失败：HTTP ${response.status}`,
    );
  }

  const payload = (await readJsonSafely(response)) as OpenAiCompatibleResponse | null;
  const toolCall = payload?.choices?.[0]?.message?.tool_calls?.find(
    (item) => item.function?.name === 'submit_resume',
  );
  const argumentsText = cleanText(toolCall?.function?.arguments);

  if (!argumentsText) {
    throw new Error('OpenAI 兼容协议未返回结构化工具结果。');
  }

  const parsed = extractJsonFromOutput(argumentsText);

  if (!parsed || typeof parsed !== 'object') {
    const preview = argumentsText.length > 200 ? argumentsText.slice(0, 200) + '…' : argumentsText;
    throw new Error(
      `OpenAI 兼容协议返回的工具参数不是合法 JSON。\n\n返回内容预览：${preview}`,
    );
  }

  return parseResumePayload(parsed, rawText);
}

async function requestViaAnthropicCompatible(
  config: ResumeImportAiConfig,
  rawText: string,
  outputLanguage: Language,
  signal?: AbortSignal,
) {
  const systemPrompt = `${AI_SYSTEM_PROMPT}\n\n${languageDirective(outputLanguage)}`;
  const response = await fetch(buildAnthropicCompatibleUrl(config.baseUrl), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model.trim(),
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: buildTextOnlyPrompt(rawText),
        },
      ],
      tools: [buildAnthropicTool()],
      tool_choice: {
        type: 'tool',
        name: 'submit_resume',
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
        ? `Anthropic 兼容协议调用失败：${errorMessage}`
        : `Anthropic 兼容协议调用失败：HTTP ${response.status}`,
    );
  }

  const payload = (await readJsonSafely(response)) as AnthropicCompatibleResponse | null;
  const toolUse = payload?.content?.find(
    (item) => item.type === 'tool_use' && item.name === 'submit_resume',
  );

  if (!toolUse?.input) {
    throw new Error('Anthropic 兼容协议未返回结构化工具结果。');
  }

  return parseResumePayload(toolUse.input, rawText);
}

type ExtractResumeDraftWithAiParams = {
  config: ResumeImportAiConfig;
  file: File;
  fileData: string;
  rawText: string;
  outputLanguage?: Language;
  signal?: AbortSignal;
};

async function routeByProvider(
  provider: ResumeImportProvider,
  config: ResumeImportAiConfig,
  file: File,
  fileData: string,
  rawText: string,
  outputLanguage: Language,
  signal?: AbortSignal,
) {
  switch (provider) {
    case 'openai-compatible':
      return requestViaOpenAiCompatible(config, rawText, outputLanguage, signal);
    case 'anthropic-compatible':
      return requestViaAnthropicCompatible(config, rawText, outputLanguage, signal);
    default:
      return requestViaOpenAiResponses(config, file, fileData, rawText, outputLanguage, signal);
  }
}

export async function extractResumeDraftWithAi({
  config,
  file,
  fileData,
  rawText,
  outputLanguage = 'zh',
  signal,
}: ExtractResumeDraftWithAiParams) {
  return routeByProvider(
    config.provider,
    config,
    file,
    fileData,
    rawText,
    outputLanguage,
    signal,
  );
}
