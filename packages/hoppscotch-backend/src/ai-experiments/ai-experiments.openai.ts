import Anthropic from '@anthropic-ai/sdk';
import type {
  ChatConnection,
  ChatProvider,
  ProviderCapabilities,
  ProviderTurn,
  ProviderTurnRequest,
  SystemBlock,
} from './ai-experiments.providers';

/**
 * Translation between the Anthropic Messages shape the client speaks and the
 * OpenAI Chat Completions shape.
 *
 * The client is not changing dialect: it still stores and echoes Anthropic
 * blocks, so this provider converts in both directions. That keeps the wire
 * protocol out of this phase, which is the largest and riskiest piece of the
 * whole migration and is not needed to reach a second vendor.
 *
 * Everything here is a pure function so it can be tested against recorded
 * request and response shapes without a network or a key.
 */

export type OpenAITool = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export type OpenAIToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type OpenAIMessage =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

/**
 * Tool definitions, renamed rather than rewritten.
 *
 * Our 44 schemas use `enum` and nothing else beyond the basics — no `$ref`,
 * no `oneOf`, no `format` — so the JSON Schema itself travels unchanged and
 * only the wrapper differs. Server-side tools (the Anthropic search tool) have
 * no schema and are dropped: no other provider has an equivalent.
 */
export const toOpenAITools = (tools: Anthropic.ToolUnion[]): OpenAITool[] =>
  tools
    .filter(
      (tool): tool is Anthropic.Tool =>
        typeof (tool as Anthropic.Tool).name === 'string' &&
        !!(tool as Anthropic.Tool).input_schema,
    )
    .map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        ...(tool.description ? { description: tool.description } : {}),
        parameters: tool.input_schema as unknown as Record<string, unknown>,
      },
    }));

type AnthropicBlock = {
  type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
};

/** Flattens a tool result's content, which may be a string or blocks. */
const toolResultText = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block) =>
        typeof block === 'string'
          ? block
          : String((block as AnthropicBlock)?.text ?? ''),
      )
      .join('');
  }
  return '';
};

/**
 * Rewrites the transcript into OpenAI's shape.
 *
 * The two structural differences: a tool result is its own message with a
 * `tool` role rather than a block inside the following user turn, and an
 * assistant's calls live beside its text rather than among it. Ordering is
 * preserved, which is what keeps each result adjacent to the call it answers.
 */
export const toOpenAIMessages = (
  system: SystemBlock[],
  messages: unknown[],
): OpenAIMessage[] => {
  const out: OpenAIMessage[] = [];

  const systemText = system
    .map((block) => block.text)
    .filter(Boolean)
    .join('\n\n');
  if (systemText) out.push({ role: 'system', content: systemText });

  for (const raw of messages) {
    const message = raw as { role?: string; content?: unknown };
    const role = message?.role === 'assistant' ? 'assistant' : 'user';
    const content = message?.content;

    if (typeof content === 'string') {
      if (content.trim()) out.push({ role, content });
      continue;
    }
    if (!Array.isArray(content)) continue;

    const blocks = content as AnthropicBlock[];
    const text = blocks
      .filter((b) => b?.type === 'text')
      .map((b) => String(b.text ?? ''))
      .join('');

    if (role === 'assistant') {
      const toolCalls = blocks
        .filter((b) => b?.type === 'tool_use')
        .map((b) => ({
          id: String(b.id ?? ''),
          type: 'function' as const,
          function: {
            name: String(b.name ?? ''),
            arguments: JSON.stringify(b.input ?? {}),
          },
        }));
      if (text || toolCalls.length) {
        out.push({
          role: 'assistant',
          content: text || null,
          ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
        });
      }
      continue;
    }

    // Results first, so each one still follows the call it answers.
    for (const block of blocks.filter((b) => b?.type === 'tool_result')) {
      const body = toolResultText(block.content);
      out.push({
        role: 'tool',
        tool_call_id: String(block.tool_use_id ?? ''),
        // OpenAI's tool message carries no error flag, so a failure has to be
        // stated in the text or it is lost in translation.
        content: block.is_error ? `[error] ${body}` : body,
      });
    }
    if (text.trim()) out.push({ role: 'user', content: text });
  }

  return out;
};

export type OpenAICompletion = {
  id?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | null;
      refusal?: string | null;
      tool_calls?: OpenAIToolCall[];
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
      cache_write_tokens?: number;
    };
  };
};

/** Reads a tool call's arguments, tolerating a model that emitted bad JSON. */
const parseArguments = (
  call: OpenAIToolCall,
): { input: Record<string, unknown>; malformed: boolean } => {
  const raw = call.function?.arguments;
  if (!raw) return { input: {}, malformed: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { input: parsed as Record<string, unknown>, malformed: false }
      : { input: {}, malformed: true };
  } catch {
    return { input: {}, malformed: true };
  }
};

/**
 * Reduces a completion to the neutral turn the service works with.
 *
 * Note what is absent rather than zero: OpenAI reports no cache-write count,
 * so that counter stays undefined instead of claiming nothing was written.
 */
export const fromOpenAICompletion = (
  completion: OpenAICompletion,
): ProviderTurn => {
  const choice = completion.choices?.[0];
  const message = choice?.message;

  const toolCalls: ProviderTurn['toolCalls'] = [];
  const malformed: string[] = [];
  for (const call of message?.tool_calls ?? []) {
    const { input, malformed: bad } = parseArguments(call);
    if (bad) malformed.push(call.function?.name ?? call.id);
    toolCalls.push({
      id: String(call.id ?? ''),
      name: String(call.function?.name ?? ''),
      input,
    });
  }

  let content = String(message?.content ?? '').trim();
  // A model that emitted unparseable arguments has not done what it claimed;
  // say so rather than executing the tool with an empty input silently.
  if (malformed.length) {
    const notice = `⚠️ ${malformed.join(', ')} was called with arguments I couldn't read, so its input may be incomplete.`;
    content = content ? `${content}\n\n${notice}` : notice;
  }

  const stopReason: ProviderTurn['stopReason'] = message?.refusal
    ? 'refusal'
    : choice?.finish_reason === 'length'
      ? 'max_tokens'
      : 'end';

  return {
    traceId: String(completion.id ?? ''),
    content: message?.refusal ? String(message.refusal) : content,
    toolCalls,
    loadedTools: [],
    usage: {
      input_tokens: completion.usage?.prompt_tokens,
      output_tokens: completion.usage?.completion_tokens,
      cache_read_input_tokens:
        completion.usage?.prompt_tokens_details?.cached_tokens,
      cache_creation_input_tokens:
        completion.usage?.prompt_tokens_details?.cache_write_tokens,
    },
    stopReason,
  };
};

export class OpenAIHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`OpenAI-dialect request failed with ${status}`);
    this.name = 'OpenAIHttpError';
  }
}

export const joinURL = (baseURL: string, path: string): string =>
  `${baseURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

/**
 * Credential header for the dialect.
 *
 * `api-key` means "the dialect's usual header", which for OpenAI is a bearer
 * token; Azure additionally accepts its own `api-key` header, which is what
 * gateways in front of Azure most often expect.
 */
export const authHeaders = (
  auth: 'api-key' | 'bearer' | 'azure-api-key',
  key: string,
): Record<string, string> =>
  auth === 'azure-api-key'
    ? { 'api-key': key }
    : { Authorization: `Bearer ${key}` };

/**
 * Talks the OpenAI Chat Completions dialect over plain fetch.
 *
 * No SDK: there is one non-streaming call per step, and Azure needs the URL
 * and credential header under our own control anyway. Retries cover only the
 * transient statuses, because a 400 here means the transcript is wrong and
 * repeating it would just cost more.
 */
export class OpenAIChatProvider implements ChatProvider {
  constructor(private readonly connection: ChatConnection) {}

  get model(): string {
    return this.connection.model;
  }

  get capabilities(): ProviderCapabilities {
    return this.connection.capabilities;
  }

  /** This dialect has no server-side tool search to be rejected. */
  isDeferralRejection(): boolean {
    return false;
  }

  isBadRequest(error: unknown): boolean {
    return error instanceof OpenAIHttpError && error.status === 400;
  }

  async send(request: ProviderTurnRequest): Promise<ProviderTurn> {
    const { connection } = this;
    if (!connection.baseURL) {
      throw new Error('the OpenAI dialect needs a base URL');
    }

    const limitField = connection.tokenLimitField ?? 'max_tokens';
    const body = {
      model: connection.model,
      messages: toOpenAIMessages(request.system, request.messages),
      tools: toOpenAITools(request.tools),
      [limitField]: request.maxTokens,
      // Reasoning models refuse function tools on this endpoint unless it is
      // switched off. Omitted entirely where a preset has no opinion, since
      // most compatible endpoints do not know the field.
      ...(connection.reasoningEffort
        ? { reasoning_effort: connection.reasoningEffort }
        : {}),
    };

    const attempts = (connection.maxRetries ?? 2) + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const res = await fetch(
          joinURL(connection.baseURL, 'chat/completions'),
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              ...authHeaders(connection.auth, connection.apiKey),
            },
            body: JSON.stringify(body),
            ...(connection.timeoutMs
              ? { signal: AbortSignal.timeout(connection.timeoutMs) }
              : {}),
          },
        );

        if (res.ok) {
          return fromOpenAICompletion((await res.json()) as OpenAICompletion);
        }

        const payload: unknown = await res.json().catch(() => null);
        const error = new OpenAIHttpError(res.status, payload);
        // Anything the caller can fix by changing the request is final.
        if (res.status < 500 && res.status !== 429) throw error;
        lastError = error;
      } catch (e) {
        if (
          e instanceof OpenAIHttpError &&
          e.status < 500 &&
          e.status !== 429
        ) {
          throw e;
        }
        lastError = e;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('the OpenAI-dialect request failed');
  }
}
