/**
 * 简历批量翻译：把整份简历（中文 master）一次性翻译成任意语言。
 *
 * 工作流程：
 *   1. 用户切换到非 zh 语言时由 App.tsx 调用。
 *   2. 序列化 ResumeProfile 为 AI 友好的 JSON 摘要。
 *   3. 强制要求 AI 输出完整 ResumeProfile JSON，保留 id / period / company / school / name / location 等不可翻译字段。
 *   4. 失败时抛出错误，让 UI 层显示重试按钮。
 */

import { createAiRequest } from '../ai/aiRequest';
import { getLanguageName } from './languageDirective';
import type { ResumeImportAiConfig } from '../../types/resume-import';
import type { ResumeProfile } from '../../types/resume';

function buildTranslationSystemPrompt(targetLang: string): string {
  const langName = getLanguageName(targetLang);
  return `You are a professional resume translator.

Task: Translate the given Chinese resume into ${langName}. The output must be a complete ResumeProfile JSON object that matches the provided JSON schema.

Translation rules:
- Translate all user-facing text into natural, professional ${langName}.
- Preserve the original structure (sections, items, ordering).
- Keep these fields untranslated verbatim: id, company, school, name, period, location, dates.
- Professional titles, role names, and technology terms should use standard ${langName} equivalents.
- For each achievements / actions / outcomes item, preserve the meaning but use strong ${langName} resume language.
- Return empty string for fields that are absent in the source.
- All project ids must be preserved exactly.
- Do not invent experience, metrics, technologies, employers, or responsibilities.
- Return strictly the JSON, no markdown, no commentary.`;
}

function buildTranslationUserPrompt(zhProfile: ResumeProfile, targetLang: string): string {
  const langName = getLanguageName(targetLang);
  return [
    `Translate this Chinese resume into ${langName}. Return the full ResumeProfile JSON object.`,
    '',
    'Source resume JSON:',
    JSON.stringify(zhProfile, null, 2),
  ].join('\n');
}

const TRANSLATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
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
        'focusTags',
      ],
      properties: {
        name: { type: 'string' },
        title: { type: 'string' },
        subtitle: { type: 'string' },
        summary: { type: 'string' },
        intent: { type: 'string' },
        location: { type: 'string' },
        avatarUrl: { type: 'string' },
        focusTags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    highlights: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'metric', 'icon'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          metric: { type: 'string' },
          icon: { type: 'string' },
        },
      },
    },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
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
          id: { type: 'string' },
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

type RawPayload = {
  basics?: Record<string, unknown>;
  highlights?: Array<Record<string, unknown>>;
  experience?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  skills?: Array<Record<string, unknown>>;
  education?: Array<Record<string, unknown>>;
  certificates?: Array<Record<string, unknown>>;
  contactLinks?: Array<Record<string, unknown>>;
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanOptionalText(value: unknown): string | undefined {
  const normalized = cleanText(value);
  return normalized || undefined;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => cleanText(entry))
    .filter((entry, index, list) => entry.length > 0 && list.indexOf(entry) === index);
}

function buildTranslatedProfile(payload: unknown, source: ResumeProfile): ResumeProfile {
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI 未返回翻译后的简历数据。');
  }

  const data = payload as RawPayload;
  const basics = data.basics ?? {};

  // Map highlights: copy fields; fall back to source if AI returns empty
  const highlights = Array.isArray(data.highlights)
    ? data.highlights.map((item, index) => {
        const fallback = source.highlights[index] ?? source.highlights[0];
        return {
          title: cleanText(item.title) || fallback?.title || '',
          description: cleanText(item.description) || fallback?.description || '',
          metric: cleanOptionalText(item.metric) ?? fallback?.metric,
          icon: cleanOptionalText(item.icon) ?? fallback?.icon,
        };
      })
    : [];

  // Map experience: preserve id from source by index
  const experience = Array.isArray(data.experience)
    ? data.experience.map((item, index) => {
        const fallback = source.experience[index];
        return {
          id: fallback?.id,
          company: cleanText(item.company) || fallback?.company || '',
          role: cleanText(item.role) || fallback?.role || '',
          period: cleanText(item.period) || fallback?.period || '',
          location: cleanOptionalText(item.location) ?? fallback?.location,
          summary: cleanOptionalText(item.summary) ?? fallback?.summary,
          achievements: cleanStringArray(item.achievements).length
            ? cleanStringArray(item.achievements)
            : (fallback?.achievements ?? []),
          tags: cleanStringArray(item.tags).length
            ? cleanStringArray(item.tags)
            : fallback?.tags,
          relatedProjectIds: cleanStringArray(item.relatedProjectIds).length
            ? cleanStringArray(item.relatedProjectIds)
            : fallback?.relatedProjectIds,
        };
      })
    : [];

  // Map projects: preserve id by lookup, fall back to source
  const projects = Array.isArray(data.projects)
    ? data.projects.map((item) => {
        const idFromAi = cleanOptionalText(item.id);
        const sourceMatch = idFromAi
          ? source.projects.find((p) => p.id === idFromAi)
          : undefined;
        const fallback =
          sourceMatch ??
          source.projects.find((p) => cleanText(p.name) === cleanText(item.name)) ??
          source.projects[0];

        return {
          id: fallback?.id,
          name: cleanText(item.name) || fallback?.name || '',
          role: cleanText(item.role) || fallback?.role || '',
          period: cleanOptionalText(item.period) ?? fallback?.period,
          summary: cleanOptionalText(item.summary) ?? fallback?.summary,
          background: cleanText(item.background) || fallback?.background || '',
          actions: cleanStringArray(item.actions).length
            ? cleanStringArray(item.actions)
            : (fallback?.actions ?? []),
          outcomes: cleanStringArray(item.outcomes).length
            ? cleanStringArray(item.outcomes)
            : (fallback?.outcomes ?? []),
          tags: cleanStringArray(item.tags).length
            ? cleanStringArray(item.tags)
            : fallback?.tags,
          featured:
            typeof item.featured === 'boolean' ? item.featured : fallback?.featured ?? false,
        };
      })
    : [];

  const skills = Array.isArray(data.skills)
    ? data.skills.map((item) => ({
        category: cleanText(item.category),
        items: cleanStringArray(item.items),
      }))
    : [];

  const education = Array.isArray(data.education)
    ? data.education.map((item) => ({
        school: cleanText(item.school),
        degree: cleanText(item.degree),
        major: cleanOptionalText(item.major),
        period: cleanText(item.period),
      }))
    : [];

  const certificates = Array.isArray(data.certificates)
    ? data.certificates.map((item) => ({
        name: cleanText(item.name),
        issuer: cleanOptionalText(item.issuer),
        date: cleanOptionalText(item.date),
      }))
    : [];

  const contactLinks = Array.isArray(data.contactLinks)
    ? data.contactLinks.map((item) => {
        const type = item.type;
        return {
          label: cleanText(item.label),
          value: cleanText(item.value),
          href: cleanOptionalText(item.href),
          type:
            type === 'email' || type === 'phone' || type === 'url' || type === 'text'
              ? type
              : undefined,
        };
      })
    : [];

  return {
    basics: {
      name: cleanText(basics.name) || source.basics.name,
      title: cleanText(basics.title) || source.basics.title,
      subtitle: cleanText(basics.subtitle),
      summary: cleanText(basics.summary),
      intent: cleanOptionalText(basics.intent),
      location: cleanOptionalText(basics.location),
      avatarUrl: cleanOptionalText(basics.avatarUrl),
      focusTags: cleanStringArray(basics.focusTags).length
        ? cleanStringArray(basics.focusTags)
        : source.basics.focusTags,
    },
    highlights,
    experience,
    projects,
    skills,
    education,
    certificates,
    contactLinks,
  };
}

type TranslateResumeParams = {
  zhProfile: ResumeProfile;
  config: ResumeImportAiConfig;
  targetLanguage: string;
  signal?: AbortSignal;
};

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

async function requestViaOpenAiResponses(
  config: ResumeImportAiConfig,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<RawPayload> {
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
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
      ],
      max_output_tokens: 4000,
      text: {
        format: {
          type: 'json_schema',
          name: 'resume_translation',
          strict: true,
          schema: TRANSLATION_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(
      errorPayload?.error?.message
        ? `AI 翻译失败：${errorPayload.error.message}`
        : `AI 翻译失败：HTTP ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const outputText = payload.output_text ?? payload.output?.[0]?.content?.[0]?.text ?? '';

  if (!outputText) {
    throw new Error('AI 未返回翻译数据。');
  }

  try {
    return JSON.parse(outputText) as RawPayload;
  } catch {
    throw new Error('AI 返回的数据不是合法 JSON。');
  }
}

async function requestViaOpenAiCompatible(
  config: ResumeImportAiConfig,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<RawPayload> {
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
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'submit_translation',
            description: 'Return the structured translated resume payload.',
            parameters: TRANSLATION_SCHEMA,
          },
        },
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'submit_translation' },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI 兼容协议调用失败：HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        tool_calls?: Array<{ function?: { arguments?: string } }>;
      };
    }>;
  };
  const argumentsText = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? '';
  if (!argumentsText) {
    throw new Error('OpenAI 兼容协议未返回翻译结果。');
  }
  return JSON.parse(argumentsText) as RawPayload;
}

async function requestViaAnthropicCompatible(
  config: ResumeImportAiConfig,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<RawPayload> {
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
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          name: 'submit_translation',
          description: 'Return the structured translated resume payload.',
          input_schema: TRANSLATION_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_translation' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic 兼容协议调用失败：HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; name?: string; input?: unknown }>;
  };
  const toolUse = payload.content?.find(
    (item) => item.type === 'tool_use' && item.name === 'submit_translation',
  );
  if (!toolUse?.input) {
    throw new Error('Anthropic 兼容协议未返回翻译结果。');
  }
  return toolUse.input as RawPayload;
}

export async function translateResumeProfile(
  params: TranslateResumeParams,
): Promise<ResumeProfile> {
  const { zhProfile, config, targetLanguage, signal } = params;

  if (targetLanguage === 'zh') {
    return zhProfile;
  }

  const systemPrompt = buildTranslationSystemPrompt(targetLanguage);
  const userPrompt = buildTranslationUserPrompt(zhProfile, targetLanguage);

  // Wrap the underlying fetch with createAiRequest so it respects abort/timeout
  const handle = createAiRequest<RawPayload>(
    async (abortSignal) => {
      switch (config.provider) {
        case 'openai-compatible':
          return requestViaOpenAiCompatible(config, systemPrompt, userPrompt, abortSignal);
        case 'anthropic-compatible':
          return requestViaAnthropicCompatible(config, systemPrompt, userPrompt, abortSignal);
        default:
          return requestViaOpenAiResponses(config, systemPrompt, userPrompt, abortSignal);
      }
    },
    { timeoutMs: 60_000 },
  );

  if (signal) {
    signal.addEventListener('abort', () => handle.abort());
  }

  const payload = await handle.promise;
  return buildTranslatedProfile(payload, zhProfile);
}
