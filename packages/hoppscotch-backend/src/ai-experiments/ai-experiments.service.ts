import { HttpStatus, Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import * as E from 'fp-ts/Either';
import {
  AI_EXPERIMENTS_CANNOT_RUN_CHAT,
  AI_EXPERIMENTS_CHAT_DISABLED,
  AI_EXPERIMENTS_MODEL_UNAVAILABLE,
  AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
  AI_EXPERIMENTS_INVALID_CHAT_INPUT,
} from 'src/errors';
import { RESTError } from 'src/types/RESTError';
import {
  buildChatTools,
  buildSearchableChatTools,
  collectUsedToolNames,
  findToolsByQuery,
} from './ai-experiments.tools';
import { ChatResponse } from './types/ai-experiments.response.types';
import {
  ChatConnection,
  ChatProvider,
  ProviderTurn,
  SystemBlock,
  baseURLHintFor,
  requiresBaseURLFor,
  createChatProvider,
  applyOverrides,
  validateModelForPreset,
} from './ai-experiments.providers';
import { AIProviderService } from 'src/ai-provider/ai-provider.service';
import { AISettingsService } from 'src/ai-provider/ai-settings.service';

const CHAT_SYSTEM_PROMPT = `You are Hoppscotch's AI assistant, embedded in the Hoppscotch API client. You get work done by CALLING TOOLS, not by describing them: when the user asks to open, run, save, add, set, change, create, select, switch, close, duplicate, publish, mock or document something, your response MUST contain the matching tool call(s). Never narrate an action you did not perform with a tool this turn. Answer in prose only for questions or when you genuinely need a clarification.

## Acting
- Emit ALL tool calls for a multi-action request in one response; they run in order (edits first, then run_request).
- Match collections, requests, environments, teams, and mock servers by name: the context lists collection and environment names; call list_collections for the folder/request outline, list_mock_servers for mock servers, and get_graphql_schema before writing GraphQL operations.
- Never invent header, param, or token values; ask when something is ambiguous. A user credential appears as <<local-ref:...>>: copy it unchanged into a secret environment variable (preferred) or into the header/auth value requested — the client resolves it locally.
- Multi-endpoint work: create_collection, then add_or_update_collection_requests with test scripts and a description per endpoint; use <<var>> placeholders and secret variables for credentials; verify with run_collection and report only its result.
- Collection properties (auth, headers, variables, scripts, description) are inherited by the requests inside. Documentation = the Markdown description of a request or collection; publish_documentation returns a public URL and an attached environment's values become public — say so. A mock server serves each request's saved example responses.
- Every tool acts on the ACTIVE workspace (personal or a team); switch_workspace changes it, create_team creates and switches, rename_team is owner-only.

## How Hoppscotch works
- Variables: <<name>> anywhere in a request, resolved from the active environment then the global one; initial value is shared, current value is local; secrets never sync. Dynamic: <<$guid>>, <<$timestamp>>, <<$isoTimestamp>>, <<$randomInt>>, <<$randomUUID>>, <<$randomBoolean>>.
- Auth: None, Inherit, Bearer, Basic, API key, OAuth 2.0, AWS Signature. Body: JSON, form-urlencoded, multipart, XML, HTML, text, binary.
- Scripts use the pw sandbox: pw.env.set("token", v); pw.test("ok", () => pw.expect(pw.response.status).toBe(200)); pw.response has status, body, headers.
- Tabs hold REST or GraphQL requests. GraphQL tabs use set_query / set_gql_variables; set_url, header, auth, name, and script tools work on both; method/body/query-param tools are REST-only. run_request runs the active tab; switch_protocol converts a tab, keeping the other protocol's edits as a draft.
- Requests go through an interceptor (Browser, Proxy, Agent/desktop), which affects CORS and localhost access.

## Style
Concise Markdown, short replies. Reference variables as <<name>>.`;

/**
 * Appended to the system prompt only when deferred tool loading is active —
 * on the fully loaded fallback there is no search tool to call.
 */
const FINDING_TOOLS_SECTION = `## Finding tools
Only the most common request-editing tools plus run_request, save_request, get_graphql_schema, and list_collections are loaded up front. Everything else is available through tool search (tool_search_tool_regex): request name/variables/scripts, GraphQL query and variables, tabs and protocol switching, the interceptor, environments and variables, collections and folders (create, save into, add requests, open, run, properties, description), teams and workspaces, documentation publishing, and mock servers. Whenever a request goes beyond editing/running/saving the current request, SEARCH first and never say a capability is missing without searching. Always search with limit 50 (only matching tools are loaded, so a high limit costs nothing) using a family pattern — "collection", "environment", "_tab|protocol", "interceptor", "mock", "documentation|description|publish", "team|workspace", "script", "query|graphql", "rename|variables" — or the exact tool name when you know it.`;

/**
 * Output-token ceiling per turn. The tool contract asks the model to re-emit
 * FULL bodies/scripts in a single tool_use block, so this must comfortably fit
 * a large edited request body plus prose (billing is per generated token, so a
 * high ceiling costs nothing on normal turns).
 */
const MAX_OUTPUT_TOKENS = 8192;

/**
 * Aggregate input ceiling (serialized chars, ~4 chars/token). The chat UI
 * legitimately produces far less; this stops a hand-crafted request from
 * billing an entire context window of input tokens to the operator's key.
 */
const MAX_MESSAGES_JSON_LENGTH = 400_000;

/**
 * The client drives at most six round-trips per turn, so a legitimate request
 * carries at most five assistant tool-use turns. Counting them here makes the
 * ceiling a server-side control rather than a client-side courtesy, and needs
 * no extra field on the wire because the transcript already says it.
 */
const MAX_TOOL_USE_TURNS = 6;

/**
 * How many times the broker will answer a `find_tools` call and re-ask within
 * a single request. Two is enough for "find the family, then find the sibling"
 * and bounds what one client request can cost.
 */
const MAX_LOCAL_SEARCH_ROUNDS = 2;

/**
 * The same instruction as above, for providers with no server-side search.
 * The mechanism differs — a plain tool taking a natural-language query rather
 * than a regex — so the wording has to as well.
 */
const LOCAL_FINDING_TOOLS_SECTION = `## Finding tools
Only the most common request-editing tools plus run_request, save_request, get_graphql_schema, and list_collections are loaded up front. Everything else is available through the find_tools tool: request name/variables/scripts, GraphQL query and variables, tabs and protocol switching, the interceptor, environments and variables, collections and folders (create, save into, add requests, open, run, properties, description), teams and workspaces, documentation publishing, and mock servers. Whenever a request goes beyond editing/running/saving the current request, call find_tools FIRST and never say a capability is missing without searching. Describe what you are trying to do in a few words, e.g. find_tools({"query": "create a collection"}) or find_tools({"query": "publish documentation"}). The tools it returns become callable in your next message.`;
const REDACTED_VALUE = '[REDACTED]';

/**
 * Values that may stay visible: environment placeholders (<<name>>, <<$fn>>)
 * and the client-local secret references the frontend substitutes for typed
 * credentials (<<local-ref:id>>) — both are opaque to the model.
 */
const SAFE_VALUE_PREFIX =
  /^<<(?:local-ref:[A-Za-z0-9_-]+|\$?[A-Za-z][A-Za-z0-9_.-]*|_[A-Za-z0-9_.-]*)>>/;
const SENSITIVE_TEMPLATE_PREFIX = /^<<(?:sk_|rk_|whsec_|sk-ant-)/i;
/** JSON/YAML literals that follow a keyword used as a FIELD NAME, not a value. */
const STRUCTURAL_LITERAL = /^(?:true|false|null|\d+(?:\.\d+)?|[[{])/;
/** GraphQL SDL type references after a field/argument name (`password: String!`). */
const TYPE_REFERENCE = /^\[?[A-Z][A-Za-z0-9_]*!?\]?!?$/;

const isSafeValue = (value: string) =>
  SAFE_VALUE_PREFIX.test(value) && !SENSITIVE_TEMPLATE_PREFIX.test(value);

// Whitespace runs are bounded on purpose: an unbounded `\s*["']?\s*` pair
// backtracks quadratically on a keyword followed by a long whitespace run.
const KEY_SEP = `[ \\t]{0,8}["']?[ \\t]{0,8}[:=][ \\t]{0,8}["']?`;

/** `Authorization: <scheme> <credential>` — the scheme stays, the credential goes. */
const AUTH_HEADER_ASSIGNMENT = new RegExp(
  `((?:authorization|proxy-authorization)${KEY_SEP})((?:Bearer|Basic|Token|Negotiate|NTLM|OAuth)[ \\t]+)?((?:Digest|AWS4-HMAC-SHA256|Signature)[ \\t]+[^\\r\\n"'}]+|[^\\s,}"']+)`,
  'gi',
);
/** Cookie headers carry several `k=v` pairs — redact the whole value. */
const COOKIE_ASSIGNMENT = new RegExp(
  `((?:cookie|set-cookie)${KEY_SEP})([^\\r\\n"'}]+)`,
  'gi',
);
/** Single-token credential assignments (`api_key=…`, `"password": "…"`). */
const SENSITIVE_ASSIGNMENT = new RegExp(
  `((?:x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|client[-_]?secret|password|secret)${KEY_SEP})([^,\\s}"']+)`,
  'gi',
);
/** Bare credentials with a recognizable shape, wherever they appear. */
const STANDALONE_SECRET =
  /\b(?:sk-ant-[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{20,}|sk_(?:test|live)_[A-Za-z0-9]+|rk_(?:test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})/g;

export const sanitizeChatContent = (content: string): string =>
  content
    .replace(
      AUTH_HEADER_ASSIGNMENT,
      (match, prefix: string, scheme: string | undefined, secret: string) =>
        isSafeValue(secret)
          ? match
          : `${prefix}${scheme ?? ''}${REDACTED_VALUE}`,
    )
    .replace(COOKIE_ASSIGNMENT, (match, prefix: string, secret: string) =>
      isSafeValue(secret) ? match : `${prefix}${REDACTED_VALUE}`,
    )
    .replace(SENSITIVE_ASSIGNMENT, (match, prefix: string, secret: string) =>
      isSafeValue(secret) ||
      STRUCTURAL_LITERAL.test(secret) ||
      TYPE_REFERENCE.test(secret)
        ? match
        : `${prefix}${REDACTED_VALUE}`,
    )
    .replace(STANDALONE_SECRET, REDACTED_VALUE);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Blocks the API must receive byte-for-byte (search results, thinking signatures). */
const PASSTHROUGH_BLOCK_TYPES = new Set([
  'server_tool_use',
  'tool_search_tool_result',
  'thinking',
  'redacted_thinking',
]);

const sanitizeStructuredChatValue = (value: unknown): unknown => {
  if (typeof value === 'string') return sanitizeChatContent(value);
  if (Array.isArray(value)) return value.map(sanitizeStructuredChatValue);
  if (!isRecord(value)) return value;
  if (
    typeof value.type === 'string' &&
    PASSTHROUGH_BLOCK_TYPES.has(value.type)
  ) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      sanitizeChatContent(key),
      sanitizeStructuredChatValue(nestedValue),
    ]),
  );
};

export const sanitizeStructuredChatContent = (content: unknown[]): unknown[] =>
  content.map(sanitizeStructuredChatValue);

/**
 * Puts a cache breakpoint on the final content block of the transcript, so the
 * next step of the client's tool loop (which resends this transcript plus two
 * more turns) reads everything up to here from the cache.
 */
const markTranscriptTail = (messages: Anthropic.MessageParam[]) => {
  const last = messages[messages.length - 1];
  if (!last) return;
  if (typeof last.content === 'string') {
    last.content = [
      {
        type: 'text',
        text: last.content,
        cache_control: { type: 'ephemeral' },
      },
    ];
    return;
  }
  const block = last.content[last.content.length - 1];
  if (block && typeof block === 'object') {
    (
      block as { cache_control?: Anthropic.CacheControlEphemeral }
    ).cache_control = { type: 'ephemeral' };
  }
};

@Injectable()
export class AIExperimentsService {
  constructor(
    private readonly aiProviderService: AIProviderService,
    private readonly aiSettingsService: AISettingsService,
  ) {}

  /**
   * Resolves the connection a turn should be served on.
   *
   * The admin dashboard is the only source of connections; the environment
   * supplies tuning on top, never a credential. A request naming a connection
   * or a model is asking for one specific thing, so a miss is reported as such
   * rather than quietly served by whatever else happens to be configured.
   */
  private async resolveConnection(
    connectionID?: string,
    requestedModel?: string,
  ): Promise<E.Either<RESTError, ChatConnection>> {
    const resolved = await this.aiProviderService.resolveForChat(
      connectionID,
      requestedModel,
    );

    if (E.isRight(resolved)) {
      return E.right(
        applyOverrides(
          resolved.right,
          await this.aiSettingsService.overrides(),
        ),
      );
    }

    if (connectionID || requestedModel) {
      console.warn(
        `[AIExperiments] connection ${connectionID ?? '(default)'} does not offer ${requestedModel ?? '(its default model)'}`,
      );
      return E.left({
        message: AI_EXPERIMENTS_MODEL_UNAVAILABLE,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    console.error(
      '[AIExperiments] no AI provider is registered; add one in the admin dashboard',
    );
    return E.left({
      message: AI_EXPERIMENTS_CHAT_DISABLED,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }

  /**
   * Connections observed to reject deferred tool loading, keyed by preset and
   * model. Capabilities are declared up front; this is only the safety net for
   * a connection that claims support it turns out not to have. Keyed rather
   * than global so one misconfigured connection cannot quietly degrade every
   * other one sharing the process.
   */
  private readonly deferralUnsupported = new Set<string>();

  private static hasSearchBlocks(messages: Anthropic.MessageParam[]): boolean {
    return messages.some(
      (m) =>
        Array.isArray(m.content) &&
        (m.content as Array<{ type?: string }>).some(
          (b) =>
            b?.type === 'server_tool_use' ||
            b?.type === 'tool_search_tool_result',
        ),
    );
  }

  /**
   * How many assistant turns in the transcript already carry a tool call —
   * i.e. how many steps of this turn the client has already driven.
   */
  private static countToolUseTurns(
    messages: { role: string; content: string | unknown[] }[],
  ): number {
    return messages.filter(
      (m) =>
        m?.role === 'assistant' &&
        Array.isArray(m.content) &&
        (m.content as Array<{ type?: string }>).some(
          (b) => b?.type === 'tool_use',
        ),
    ).length;
  }

  /**
   * Runs a chat turn through the configured provider with request-editing tools.
   *
   * The tools are executed client-side (they mutate the request in the
   * browser), so this returns the model's text plus any tool calls it decided
   * to make; the frontend applies them and drives the multi-step loop by
   * echoing tool_use / tool_result blocks back through `messages`.
   *
   * @param messages Conversation history ([{ role, content }], ending with the user turn).
   * @param context Serialized snapshot of the current request/response/environment.
   * @param requestedModel Model the client asked for; must be one the connection offers.
   */
  async chat(
    messages: { role: string; content: string | unknown[] }[],
    context: string,
    requestedModel?: string,
    connectionID?: string,
  ): Promise<E.Either<RESTError, ChatResponse>> {
    // Held outside the try so the catch can ask the provider that actually ran
    // how to classify its own error, rather than assuming one vendor's type.
    let provider: ChatProvider | null = null;
    try {
      if (!(await this.aiSettingsService.isEnabled())) {
        console.error('[AIExperiments] AI chat is disabled on this instance');
        return E.left({
          message: AI_EXPERIMENTS_CHAT_DISABLED,
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        });
      }

      const resolved = await this.resolveConnection(
        connectionID,
        requestedModel,
      );
      if (E.isLeft(resolved)) return resolved;
      const connection = resolved.right;

      // A preset with no endpoint of its own cannot supply one, so an unset
      // base URL is a misconfiguration rather than "use the default".
      if (requiresBaseURLFor(connection.preset) && !connection.baseURL) {
        const hint = baseURLHintFor(connection.preset);
        console.error(
          `[AIExperiments] ${connection.preset} needs a base URL${
            hint ? `, e.g. ${hint}` : ''
          }`,
        );
        return E.left({
          message: AI_EXPERIMENTS_CHAT_DISABLED,
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        });
      }

      // Two providers fail quietly on a wrong model id: Bedrock needs a region
      // inference profile, and DeepSeek serves its own default for an id it
      // does not know rather than rejecting it.
      const verdict = validateModelForPreset(
        connection.preset,
        connection.model,
      );
      if (verdict.level === 'error') {
        console.error(
          `[AIExperiments] ${connection.preset} model rejected: ${verdict.message}`,
        );
        return E.left({
          message: AI_EXPERIMENTS_CHAT_DISABLED,
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        });
      }
      if (verdict.level === 'warn') {
        console.warn(`[AIExperiments] ${verdict.message}`);
      }

      // Reject oversized transcripts BEFORE any per-character work on them —
      // the sanitizer must never run over an unbounded payload.
      if (JSON.stringify(messages).length > MAX_MESSAGES_JSON_LENGTH) {
        return E.left({
          message: AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        });
      }

      const priorSteps = AIExperimentsService.countToolUseTurns(messages);
      if (priorSteps >= MAX_TOOL_USE_TURNS) {
        console.warn(
          `[AIExperiments] refused a turn already ${priorSteps} tool steps deep`,
        );
        return E.left({
          message: AI_EXPERIMENTS_INVALID_CHAT_INPUT,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      // `content` is a plain string for normal turns, or an array of Anthropic
      // content blocks (tool_use / tool_result / text) while the client drives a
      // multi-step tool-use loop. Sanitize either shape before forwarding it to
      // the provider; entries that carry no content are dropped rather than rejected.
      const anthropicMessages = messages
        .filter((m): m is (typeof messages)[number] => {
          if (!m || typeof m !== 'object') return false;
          return typeof m.content === 'string'
            ? m.content.trim().length > 0
            : Array.isArray(m.content) && m.content.length > 0;
        })
        .map((m) => ({
          role:
            m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content:
            typeof m.content === 'string'
              ? sanitizeChatContent(m.content)
              : sanitizeStructuredChatContent(m.content),
        })) as Anthropic.MessageParam[];

      if (anthropicMessages.length === 0) {
        return E.left({
          message: AI_EXPERIMENTS_INVALID_CHAT_INPUT,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      provider = createChatProvider(connection);
      const turn = await this.runTurn(
        provider,
        connection,
        anthropicMessages,
        context,
      );

      console.log(
        `[AIExperiments] usage provider=${connection.preset} model=${connection.model} step=${priorSteps + 1} in=${turn.usage.input_tokens} cache_read=${turn.usage.cache_read_input_tokens} cache_write=${turn.usage.cache_creation_input_tokens} out=${turn.usage.output_tokens} msgs=${anthropicMessages.length} ctxChars=${context.length} msgChars=${JSON.stringify(anthropicMessages).length}`,
      );

      // A refusal is the model's answer, not a service failure — retrying
      // will not help, so tell the user instead of returning a 500.
      if (turn.stopReason === 'refusal') {
        console.warn('[AIExperiments] chat turn was refused by the model');
        return E.right({
          content:
            "I can't help with that request. Try rephrasing it, or ask about your API request, tests, or environment.",
          tool_calls: [],
          trace_id: turn.traceId,
          model: connection.model,
          usage: turn.usage,
        });
      }

      let content = turn.content;

      // The output ceiling cut the turn short: any tool_use blocks present are
      // complete (the API drops a partial one), but the model may claim actions
      // it never got to emit — tell the user instead of passing it off as a
      // finished reply.
      if (turn.stopReason === 'max_tokens') {
        console.error(
          '[AIExperiments] chat turn hit the output-token ceiling; the reply is truncated',
        );
        const notice =
          '⚠️ The reply was cut off (output limit reached) — some of the described actions may not have been applied.';
        content = content ? `${content}\n\n${notice}` : notice;
      }

      return E.right({
        content,
        tool_calls: turn.toolCalls,
        trace_id: turn.traceId,
        model: connection.model,
        usage: turn.usage,
        // Echoed back verbatim by the client so discovered tools stay loaded
        // across the steps of this turn (only needed when tools were called).
        ...(turn.assistantContent
          ? { assistant_content: turn.assistantContent }
          : {}),
        ...(turn.loadedTools.length ? { loaded_tools: turn.loadedTools } : {}),
      });
    } catch (e) {
      console.error('[AIExperiments] chat failed:', e);
      // A 400 from the provider means the client sent a malformed transcript
      // (e.g. hand-crafted tool_use/tool_result sequences) — not our failure.
      if (provider?.isBadRequest(e)) {
        return E.left({
          message: AI_EXPERIMENTS_INVALID_CHAT_INPUT,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }
      return E.left({
        message: AI_EXPERIMENTS_CANNOT_RUN_CHAT,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  /**
   * Sends the turn, withholding non-core tools when the connection supports it
   * and retrying with the full set if the provider turns out not to.
   */
  private async runTurn(
    provider: ChatProvider,
    connection: ChatConnection,
    messages: Anthropic.MessageParam[],
    context: string,
  ): Promise<ProviderTurn> {
    // Prompt caching: the tool list + static prompt is one breakpoint (shared
    // by every user of this instance), the per-turn context is a second
    // (identical across the steps of one tool loop), and the transcript tail
    // is a third so each loop step re-reads the previous steps from cache.
    const buildSystem = (
      mode: 'all' | 'native-search' | 'local-search',
    ): SystemBlock[] => {
      const finding =
        mode === 'native-search'
          ? `\n\n${FINDING_TOOLS_SECTION}`
          : mode === 'local-search'
            ? `\n\n${LOCAL_FINDING_TOOLS_SECTION}`
            : '';
      const system: SystemBlock[] = [
        { text: `${CHAT_SYSTEM_PROMPT}${finding}`, cacheable: true },
      ];
      if (context) {
        system.push({
          text: `## Current context\n${sanitizeChatContent(context)}`,
          cacheable: true,
        });
      }
      return system;
    };

    // The tail marker exists only to carry a cache breakpoint, so it goes with
    // caching rather than outliving it as a shape some endpoints reject.
    if (connection.capabilities.promptCaching) markTranscriptTail(messages);

    const send = (deferNonCore: boolean) =>
      provider.send({
        system: buildSystem(deferNonCore ? 'native-search' : 'all'),
        messages,
        tools: buildChatTools(deferNonCore),
        maxTokens: MAX_OUTPUT_TOKENS,
        deferNonCore,
      });

    // The endpoint is part of the identity: `anthropic` is the only preset that
    // declares tool search and it pins no endpoint, so one admin can point two
    // anthropic connections at the vendor and at a gateway. Keyed on the preset
    // and model alone, a gateway's rejection would latch tool search off for
    // the genuine Anthropic connection too.
    const deferralKey = `${connection.preset}:${connection.baseURL ?? ''}:${connection.model}`;
    const canDefer =
      provider.capabilities.toolSearch &&
      !this.deferralUnsupported.has(deferralKey);

    // No server-side search: the broker runs one of its own rather than
    // shipping all 44 definitions, which is past the tool-selection cliff.
    if (!canDefer) {
      return this.runWithLocalSearch(provider, messages, buildSystem);
    }

    try {
      return await send(true);
    } catch (e) {
      // A provider without tool search support → fall back to the fully loaded
      // tool set and remember it. A transcript that already carries search
      // blocks proves support, so such a 400 is a transcript problem instead.
      if (
        !provider.isDeferralRejection(e) ||
        AIExperimentsService.hasSearchBlocks(messages)
      ) {
        throw e;
      }
      this.deferralUnsupported.add(deferralKey);
      console.warn(
        `[AIExperiments] deferred tool loading rejected for ${deferralKey}; falling back to the local tool finder`,
        e instanceof Error ? e.message : e,
      );
      return this.runWithLocalSearch(provider, messages, buildSystem);
    }
  }

  /**
   * Runs the turn with a broker-side tool finder standing in for the
   * server-side search only Anthropic offers.
   *
   * A `find_tools` call is answered here and the model is asked again, so the
   * client never sees it and the round-trips stay inside this request. Which
   * tools are available is recomputed from the transcript each time — anything
   * already called stays loaded — so nothing is remembered between requests.
   */
  private async runWithLocalSearch(
    provider: ChatProvider,
    messages: Anthropic.MessageParam[],
    buildSystem: (
      mode: 'all' | 'native-search' | 'local-search',
    ) => SystemBlock[],
  ): Promise<ProviderTurn> {
    const available = collectUsedToolNames(messages);
    const found = new Set<string>();
    const working: unknown[] = [...messages];

    for (let round = 0; ; round++) {
      const turn = await provider.send({
        system: buildSystem('local-search'),
        messages: working,
        tools: buildSearchableChatTools(new Set([...available, ...found])),
        maxTokens: MAX_OUTPUT_TOKENS,
        deferNonCore: true,
      });

      const searches = turn.toolCalls.filter((c) => c.name === 'find_tools');
      if (!searches.length || round >= MAX_LOCAL_SEARCH_ROUNDS) {
        // Any search left unanswered is dropped rather than sent to a client
        // that has no such tool to run. The raw content has to lose the same
        // block: the client echoes it back verbatim on the next step, and a
        // tool_use no tool_result can ever answer makes the provider reject
        // the whole turn.
        const toolCalls = turn.toolCalls.filter((c) => c.name !== 'find_tools');
        const assistantContent = turn.assistantContent?.filter(
          (block) =>
            !(
              typeof block === 'object' &&
              block !== null &&
              (block as { type?: unknown }).type === 'tool_use' &&
              (block as { name?: unknown }).name === 'find_tools'
            ),
        );
        return {
          ...turn,
          toolCalls,
          // An assistant turn that was nothing but searches has no content
          // left worth echoing.
          ...(assistantContent?.length
            ? { assistantContent }
            : { assistantContent: undefined }),
          loadedTools: [...found],
        };
      }

      // Echo back only the searches, each with its answer. The turn's other
      // calls are deliberately dropped: nothing has executed yet, and the
      // model will re-emit them once it can see the tools it asked for.
      const results: unknown[] = [];
      for (const search of searches) {
        const query = String(
          (search.input as { query?: unknown })?.query ?? '',
        );
        const matches = findToolsByQuery(
          query,
          new Set([...available, ...found]),
        );
        for (const tool of matches) found.add(tool.name);
        results.push({
          type: 'tool_result',
          tool_use_id: search.id,
          content: matches.length
            ? `Loaded ${matches.length} tool(s):\n${matches
                .map((t) => `- ${t.name}: ${t.description ?? ''}`)
                .join('\n')}\nCall them in your next message.`
            : `No tools matched "${query}". Try different words, or tell the user this is not supported.`,
        });
      }

      working.push({
        role: 'assistant',
        content: searches.map((s) => ({
          type: 'tool_use',
          id: s.id,
          name: s.name,
          input: s.input,
        })),
      });
      working.push({ role: 'user', content: results });
    }
  }
}
