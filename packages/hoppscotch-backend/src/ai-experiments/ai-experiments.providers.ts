import Anthropic from '@anthropic-ai/sdk';
import { OpenAIChatProvider } from './ai-experiments.openai';

/**
 * The request dialect a connection speaks. Only the Anthropic Messages shape
 * exists today; the OpenAI dialect arrives with its own provider.
 */
export type ProviderDialect = 'anthropic' | 'openai';

/**
 * What a connection can do, DECLARED rather than discovered.
 *
 * Discovery by catching an error does not work across providers: several
 * Anthropic-compatible endpoints ignore request fields they do not recognise
 * and answer 200, so a capability the model never honoured looks identical to
 * one it did. The cost of guessing wrong is silent — deferred tools that are
 * never searched for, or cache breakpoints that never warm.
 */
export type ProviderCapabilities = {
  /** Server-side tool search, so non-core tools can be withheld. */
  toolSearch: boolean;
  /** Explicit `cache_control` breakpoints on the prompt and transcript. */
  promptCaching: boolean;
  /** Reports cache read/write token counts back in `usage`. */
  cacheUsageCounters: boolean;
};

/**
 * How the credential travels. Anthropic and its compatible endpoints take an
 * `x-api-key` header; Bedrock's compatible route takes a bearer token.
 */
export type AuthStyle = 'api-key' | 'bearer' | 'azure-api-key';

/** A named preset. `custom` is the safe default for an unknown endpoint. */
export type ProviderPreset =
  | 'anthropic'
  | 'deepseek'
  | 'bedrock'
  | 'openai'
  | 'azure'
  | 'openai-compatible'
  | 'custom';

type Preset = {
  dialect: ProviderDialect;
  auth: AuthStyle;
  capabilities: ProviderCapabilities;
  /**
   * Which output-limit field the dialect expects. Newer OpenAI models want
   * `max_completion_tokens`; most compatible endpoints only know `max_tokens`.
   */
  tokenLimitField?: 'max_tokens' | 'max_completion_tokens';
  /**
   * Sent as `reasoning_effort`. OpenAI's reasoning models REFUSE function
   * tools on Chat Completions unless this is 'none' — the API says so in the
   * error itself, offering either the Responses API or this. Verified against
   * gpt-5.6-luna on 14 Sep 2026.
   */
  reasoningEffort?: string;
  /** Fixed vendor endpoint, where there is one. */
  defaultBaseURL?: string;
  /** Shown when the base URL is required but missing. */
  baseURLHint?: string;
  /**
   * Model ids offered as a starting point in the admin form.
   *
   * Deliberately not a catalogue: vendors add and retire ids constantly, and
   * Azure and local runtimes use names only the operator knows. The form always
   * accepts a model that is not on this list, and the connection test is what
   * actually proves an id is real.
   */
  suggestedModels?: string[];
  /**
   * False where the capability flags and auth style come from vendor
   * documentation rather than a live call. Everything here is overridable by
   * environment variable precisely because of that.
   */
  verified: boolean;
};

const PRESETS: Record<ProviderPreset, Preset> = {
  anthropic: {
    dialect: 'anthropic',
    auth: 'api-key',
    suggestedModels: [
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-haiku-4-5-20251001',
    ],
    capabilities: {
      toolSearch: true,
      promptCaching: true,
      cacheUsageCounters: true,
    },
    verified: true,
  },

  // DeepSeek publishes an Anthropic-compatible route. Its docs describe
  // silently ignoring Anthropic request fields it does not implement, so
  // caching and tool search stay off: sending them would cost money with
  // nothing in any log to say they did nothing.
  deepseek: {
    dialect: 'anthropic',
    auth: 'api-key',
    defaultBaseURL: 'https://api.deepseek.com/anthropic',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    capabilities: {
      toolSearch: false,
      promptCaching: false,
      cacheUsageCounters: false,
    },
    verified: false,
  },

  // Bedrock's Anthropic-compatible route takes a bearer token rather than the
  // usual header. AWS lists prompt caching among its supported features, so
  // that one is on; tool search appears in no AWS documentation, so it is not.
  bedrock: {
    dialect: 'anthropic',
    auth: 'bearer',
    baseURLHint: 'https://bedrock-runtime.<region>.amazonaws.com/anthropic',
    capabilities: {
      toolSearch: false,
      promptCaching: true,
      cacheUsageCounters: true,
    },
    verified: false,
  },

  // OpenAI proper. Caching is automatic and prefix-based rather than something
  // we mark, and there is no server-side tool search, so both flags are off and
  // the local tool-finder covers the 44-tool problem instead.
  openai: {
    dialect: 'openai',
    auth: 'api-key',
    tokenLimitField: 'max_completion_tokens',
    reasoningEffort: 'none',
    suggestedModels: ['gpt-5.6-luna', 'gpt-5.6-terra'],
    capabilities: {
      toolSearch: false,
      promptCaching: false,
      cacheUsageCounters: true,
    },
    verified: false,
  },

  // Azure serves the same dialect but addresses models by the DEPLOYMENT NAME
  // the customer chose, from an endpoint that carries their resource, and
  // accepts its own `api-key` header.
  azure: {
    dialect: 'openai',
    auth: 'azure-api-key',
    tokenLimitField: 'max_completion_tokens',
    reasoningEffort: 'none',
    baseURLHint: 'https://<resource>.openai.azure.com/openai/v1',
    capabilities: {
      toolSearch: false,
      promptCaching: false,
      cacheUsageCounters: true,
    },
    verified: false,
  },

  // Any other endpoint speaking the OpenAI dialect: a gateway, or a local
  // runtime such as Ollama, LM Studio, llama.cpp or vLLM. Most of those know
  // only the older output-limit field.
  'openai-compatible': {
    dialect: 'openai',
    auth: 'api-key',
    tokenLimitField: 'max_tokens',
    baseURLHint: 'http://localhost:11434/v1',
    capabilities: {
      toolSearch: false,
      promptCaching: false,
      cacheUsageCounters: false,
    },
    verified: false,
  },

  // Anything reached through a base URL we do not recognise: assume only the
  // plain Messages shape works. Being wrong this way costs money, not silence.
  custom: {
    dialect: 'anthropic',
    auth: 'api-key',
    capabilities: {
      toolSearch: false,
      promptCaching: false,
      cacheUsageCounters: false,
    },
    verified: true,
  },
};

/** Model ids that clearly belong to a different vendor than the one configured. */
const FOREIGN_MODEL = /^(claude|gpt|gemini|o[1-9])/i;

/** A bare Bedrock model id, i.e. one missing its region inference profile. */
const BARE_BEDROCK_MODEL = /^(anthropic|amazon|meta|mistral|cohere|ai21)\./i;

export type ModelVerdict =
  | { level: 'ok' }
  | { level: 'warn'; message: string }
  | { level: 'error'; message: string };

/**
 * Catches the two misconfigurations that do not announce themselves.
 *
 * Bedrock rejects a model id that carries no region inference profile, which
 * at least fails loudly. DeepSeek does the opposite and serves its own default
 * for an id it does not know, so a leftover Claude model id would answer
 * normally from the wrong model — hence the foreign-vendor check.
 */
export const validateModelForPreset = (
  preset: ProviderPreset,
  model: string,
): ModelVerdict => {
  if (!model.trim()) {
    return { level: 'error', message: 'no model is configured' };
  }

  if (preset === 'bedrock') {
    if (model.startsWith('arn:aws:bedrock:')) return { level: 'ok' };
    if (BARE_BEDROCK_MODEL.test(model)) {
      return {
        level: 'error',
        message: `Bedrock needs a region inference profile, e.g. "us.${model}" rather than "${model}"`,
      };
    }
    return { level: 'ok' };
  }

  if (preset === 'deepseek') {
    if (FOREIGN_MODEL.test(model)) {
      return {
        level: 'error',
        message: `"${model}" is not a DeepSeek model; DeepSeek answers an unknown id with its own default instead of failing, so this would silently serve the wrong model`,
      };
    }
    if (!/^deepseek/i.test(model)) {
      return {
        level: 'warn',
        message: `"${model}" does not look like a DeepSeek model id; an unknown id is served as DeepSeek's default rather than rejected`,
      };
    }
  }

  return { level: 'ok' };
};

export const DEFAULT_CHAT_MODEL = 'claude-sonnet-5';

/** Everything needed to reach one provider. Read from env; a record later. */
export type ChatConnection = {
  preset: ProviderPreset;
  dialect: ProviderDialect;
  auth: AuthStyle;
  apiKey: string;
  /** Unset means the vendor default for the dialect. */
  baseURL?: string;
  model: string;
  capabilities: ProviderCapabilities;
  tokenLimitField?: 'max_tokens' | 'max_completion_tokens';
  reasoningEffort?: string;
  timeoutMs?: number;
  maxRetries?: number;
};

export const isKnownPreset = (name: string): name is ProviderPreset =>
  name in PRESETS;

export const listPresets = (): ProviderPreset[] =>
  Object.keys(PRESETS) as ProviderPreset[];

export type PresetDescriptor = {
  name: ProviderPreset;
  dialect: ProviderDialect;
  baseURLHint?: string;
  defaultBaseURL?: string;
  requiresBaseURL: boolean;
  suggestedModels: string[];
  verified: boolean;
};

/**
 * Every preset with the details a form needs to ask for the right fields.
 *
 * `requiresBaseURL` repeats the condition the validator enforces rather than
 * stating its own, so a form built from this cannot ask for less than the
 * server will insist on.
 */
export const describePresets = (): PresetDescriptor[] =>
  listPresets().map((name) => ({
    name,
    dialect: PRESETS[name].dialect,
    baseURLHint: PRESETS[name].baseURLHint,
    defaultBaseURL: PRESETS[name].defaultBaseURL,
    requiresBaseURL: !!PRESETS[name].baseURLHint,
    suggestedModels: PRESETS[name].suggestedModels ?? [],
    verified: PRESETS[name].verified,
  }));

export type ConnectionOverrides = {
  auth?: string;
  toolSearch?: boolean;
  promptCaching?: boolean;
  reasoningEffort?: string;
  timeoutMs?: number;
  maxRetries?: number;
};

/**
 * Applies a preset to the fields that identify one connection.
 *
 * The single place a preset turns into a usable connection, so the environment
 * path and the admin-configured path cannot drift apart.
 */
export const connectionFromPreset = (
  preset: ProviderPreset,
  fields: { apiKey: string; baseURL?: string; model: string },
  overrides: ConnectionOverrides = {},
): ChatConnection => {
  const chosen = PRESETS[preset];
  const auth = overrides.auth ?? chosen.auth;
  return {
    preset,
    dialect: chosen.dialect,
    auth:
      auth === 'bearer' || auth === 'azure-api-key' || auth === 'api-key'
        ? auth
        : chosen.auth,
    apiKey: fields.apiKey,
    baseURL: fields.baseURL || chosen.defaultBaseURL,
    model: fields.model,
    tokenLimitField: chosen.tokenLimitField,
    reasoningEffort: overrides.reasoningEffort ?? chosen.reasoningEffort,
    capabilities: {
      toolSearch: overrides.toolSearch ?? chosen.capabilities.toolSearch,
      promptCaching:
        overrides.promptCaching ?? chosen.capabilities.promptCaching,
      cacheUsageCounters: chosen.capabilities.cacheUsageCounters,
    },
    timeoutMs: overrides.timeoutMs,
    maxRetries: overrides.maxRetries,
  };
};

export const baseURLHintFor = (preset: ProviderPreset): string | undefined =>
  PRESETS[preset].baseURLHint;

export const isPresetVerified = (preset: ProviderPreset): boolean =>
  PRESETS[preset].verified;

/**
 * Layers overrides onto a connection the dashboard already resolved.
 *
 * Separate from `connectionFromPreset` because the two happen at different
 * times: the preset is applied where the row is read, and these are applied
 * where the turn is served. An unset override leaves the preset's value alone.
 */
export const applyOverrides = (
  connection: ChatConnection,
  overrides: ConnectionOverrides,
): ChatConnection => ({
  ...connection,
  reasoningEffort: overrides.reasoningEffort ?? connection.reasoningEffort,
  capabilities: {
    ...connection.capabilities,
    toolSearch: overrides.toolSearch ?? connection.capabilities.toolSearch,
    promptCaching:
      overrides.promptCaching ?? connection.capabilities.promptCaching,
  },
  timeoutMs: overrides.timeoutMs ?? connection.timeoutMs,
  maxRetries: overrides.maxRetries ?? connection.maxRetries,
});

/** One system block; `cacheable` is honoured only where caching is supported. */
export type SystemBlock = { text: string; cacheable: boolean };

/**
 * Counters are individually optional on purpose. Only Anthropic reports all
 * four; OpenAI has no cache-write count at all. An absent counter must stay
 * absent rather than becoming a zero that reads as "the cache never warmed".
 */
export type ProviderUsage = {
  input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens?: number;
};

export type ProviderTurn = {
  traceId: string;
  content: string;
  toolCalls: { id: string; name: string; input: Record<string, unknown> }[];
  /** Deferred tools discovered this turn, when the provider supports search. */
  loadedTools: string[];
  usage: ProviderUsage;
  /** Normalised terminal state; anything else collapses to `end`. */
  stopReason: 'end' | 'refusal' | 'max_tokens';
  /** Provider-native assistant blocks, echoed back verbatim by the client. */
  assistantContent?: unknown[];
};

export type ProviderTurnRequest = {
  system: SystemBlock[];
  /**
   * The transcript as the CLIENT speaks it, which is the Anthropic block shape.
   * A provider on another dialect translates it; the wire protocol itself is
   * deliberately not part of this work.
   */
  messages: unknown[];
  /** The tools to offer this turn, already narrowed by the service. */
  tools: Anthropic.ToolUnion[];
  maxTokens: number;
  /** Whether the tool list withholds non-core tools behind a search tool. */
  deferNonCore: boolean;
};

export interface ChatProvider {
  readonly model: string;
  readonly capabilities: ProviderCapabilities;
  send(request: ProviderTurnRequest): Promise<ProviderTurn>;
  /** True when the error means this model cannot defer tools. */
  isDeferralRejection(error: unknown): boolean;
  /** True for a provider 400: the caller sent something malformed. */
  isBadRequest(error: unknown): boolean;
}

export class AnthropicChatProvider implements ChatProvider {
  private readonly client: Anthropic;

  constructor(private readonly connection: ChatConnection) {
    this.client = new Anthropic({
      // Bedrock's compatible route authenticates with a bearer token; the
      // SDK sends `x-api-key` for `apiKey` and `Authorization: Bearer` for
      // `authToken`, so the choice of field IS the choice of header.
      ...(connection.auth === 'bearer'
        ? { apiKey: null, authToken: connection.apiKey }
        : { apiKey: connection.apiKey }),
      ...(connection.baseURL ? { baseURL: connection.baseURL } : {}),
      ...(connection.timeoutMs ? { timeout: connection.timeoutMs } : {}),
      ...(connection.maxRetries !== undefined
        ? { maxRetries: connection.maxRetries }
        : {}),
    });
  }

  get model(): string {
    return this.connection.model;
  }

  get capabilities(): ProviderCapabilities {
    return this.connection.capabilities;
  }

  isDeferralRejection(error: unknown): boolean {
    if (!(error instanceof Anthropic.APIError) || error.status !== 400) {
      return false;
    }
    const body = (error as { error?: { error?: { message?: unknown } } }).error;
    const message = String(body?.error?.message ?? error.message ?? '');
    // A `messages.N…` path means the transcript is at fault, not the tool.
    if (/messages\.\d+/.test(message)) return false;
    return /tool_search_tool_regex|defer_loading/i.test(message);
  }

  isBadRequest(error: unknown): boolean {
    return error instanceof Anthropic.APIError && error.status === 400;
  }

  async send(request: ProviderTurnRequest): Promise<ProviderTurn> {
    const caching = this.capabilities.promptCaching;

    const system: Anthropic.TextBlockParam[] = request.system.map((block) => ({
      type: 'text' as const,
      text: block.text,
      ...(caching && block.cacheable
        ? { cache_control: { type: 'ephemeral' as const } }
        : {}),
    }));

    const res = await this.client.messages.create({
      model: this.connection.model,
      max_tokens: request.maxTokens,
      system,
      tools: request.tools,
      messages: request.messages as Anthropic.MessageParam[],
    });

    let content = '';
    const toolCalls: ProviderTurn['toolCalls'] = [];
    const loadedTools: string[] = [];

    for (const block of res.content as unknown as Array<
      Record<string, unknown>
    >) {
      if (block.type === 'text') {
        content += String(block.text ?? '');
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: String(block.id),
          name: String(block.name),
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      } else if (block.type === 'tool_search_tool_result') {
        const result = block.content as
          { tool_references?: Array<{ tool_name?: string }> } | undefined;
        for (const ref of result?.tool_references ?? []) {
          if (ref.tool_name && !loadedTools.includes(ref.tool_name)) {
            loadedTools.push(ref.tool_name);
          }
        }
      }
    }

    const stopReason: ProviderTurn['stopReason'] =
      res.stop_reason === 'refusal'
        ? 'refusal'
        : res.stop_reason === 'max_tokens'
          ? 'max_tokens'
          : 'end';

    return {
      traceId: res.id,
      content: content.trim(),
      toolCalls,
      loadedTools,
      usage: {
        input_tokens: res.usage?.input_tokens,
        cache_read_input_tokens: res.usage?.cache_read_input_tokens,
        cache_creation_input_tokens: res.usage?.cache_creation_input_tokens,
        output_tokens: res.usage?.output_tokens,
      },
      stopReason,
      ...(toolCalls.length
        ? { assistantContent: res.content as unknown as unknown[] }
        : {}),
    };
  }
}
export const createChatProvider = (connection: ChatConnection): ChatProvider =>
  connection.dialect === 'openai'
    ? new OpenAIChatProvider(connection)
    : new AnthropicChatProvider(connection);
