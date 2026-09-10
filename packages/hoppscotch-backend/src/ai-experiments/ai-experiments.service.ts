import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as E from 'fp-ts/Either';
import {
  AI_EXPERIMENTS_CANNOT_RUN_CHAT,
  AI_EXPERIMENTS_CHAT_DISABLED,
  AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
  AI_EXPERIMENTS_INVALID_CHAT_INPUT,
} from 'src/errors';
import { RESTError } from 'src/types/RESTError';
import { buildChatTools } from './ai-experiments.tools';
import { ChatResponse } from './types/ai-experiments.response.types';

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

/** The default chat model, overridable with the ANTHROPIC_MODEL env var. */
const DEFAULT_CHAT_MODEL = 'claude-sonnet-5';

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
  constructor(private readonly configService: ConfigService) {}

  /**
   * Set once the provider rejects deferred tool loading (e.g. a model that
   * doesn't support tool search), so later requests skip the failing attempt.
   */
  private toolSearchUnsupported = false;

  private deferralEnabled(): boolean {
    return (
      !this.toolSearchUnsupported &&
      this.configService.get<string>('AI_CHAT_TOOL_SEARCH') !== 'false'
    );
  }

  /**
   * True only for a 400 that rejects the tool-search TOOL itself (a model
   * without support), never for a transcript that merely contains search
   * blocks — those errors name a `messages.N…` path and must surface as-is.
   */
  private static isToolSearchRejection(e: unknown): boolean {
    if (!(e instanceof Anthropic.APIError) || e.status !== 400) return false;
    const body = (e as { error?: { error?: { message?: unknown } } }).error;
    const message = String(body?.error?.message ?? e.message ?? '');
    if (/messages\.\d+/.test(message)) return false;
    return /tool_search_tool_regex|defer_loading/i.test(message);
  }

  /** Whether the transcript already carries tool-search blocks from this turn. */
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
   * Runs a chat turn through Anthropic with request-editing tools.
   *
   * The tools are executed client-side (they mutate the request in the
   * browser), so this returns the model's text plus any tool calls it decided
   * to make; the frontend applies them and drives the multi-step loop by
   * echoing tool_use / tool_result blocks back through `messages`.
   * Needs ANTHROPIC_API_KEY (optionally ANTHROPIC_MODEL).
   * @param messages Conversation history ([{ role, content }], ending with the user turn).
   * @param context Serialized snapshot of the current request/response/environment.
   */
  async chat(
    messages: { role: string; content: string | unknown[] }[],
    context: string,
  ): Promise<E.Either<RESTError, ChatResponse>> {
    try {
      const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
      if (
        this.configService.get<string>('AI_CHAT_ENABLED') !== 'true' ||
        !apiKey
      ) {
        console.error(
          '[AIExperiments] AI chat is disabled or ANTHROPIC_API_KEY is not set',
        );
        return E.left({
          message: AI_EXPERIMENTS_CHAT_DISABLED,
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        });
      }

      // Reject oversized transcripts BEFORE any per-character work on them —
      // the sanitizer must never run over an unbounded payload.
      if (JSON.stringify(messages).length > MAX_MESSAGES_JSON_LENGTH) {
        return E.left({
          message: AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        });
      }

      const anthropic = new Anthropic({ apiKey });

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

      // Both are the caller's fault — report them as such instead of a 500.
      if (anthropicMessages.length === 0) {
        return E.left({
          message: AI_EXPERIMENTS_INVALID_CHAT_INPUT,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }
      // Prompt caching: the tool list + static prompt is one breakpoint (shared
      // by every user of this instance), the per-turn context is a second
      // (identical across the steps of one tool loop), and the transcript tail
      // is a third so each loop step re-reads the previous steps from cache.
      const buildSystem = (
        deferNonCore: boolean,
      ): Anthropic.TextBlockParam[] => {
        const system: Anthropic.TextBlockParam[] = [
          {
            type: 'text',
            text: deferNonCore
              ? `${CHAT_SYSTEM_PROMPT}\n\n${FINDING_TOOLS_SECTION}`
              : CHAT_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ];
        if (context) {
          system.push({
            type: 'text',
            text: `## Current context\n${sanitizeChatContent(context)}`,
            cache_control: { type: 'ephemeral' },
          });
        }
        return system;
      };
      markTranscriptTail(anthropicMessages);

      const model =
        this.configService.get<string>('ANTHROPIC_MODEL') || DEFAULT_CHAT_MODEL;
      const request = (deferNonCore: boolean) =>
        anthropic.messages.create({
          model,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: buildSystem(deferNonCore),
          tools: buildChatTools(deferNonCore),
          messages: anthropicMessages,
        });

      let res: Anthropic.Message;
      if (this.deferralEnabled()) {
        try {
          res = await request(true);
        } catch (e) {
          // A model without tool search support → fall back to the fully
          // loaded tool set (today's behaviour) and remember it. A transcript
          // that already carries search blocks proves the model supports it,
          // so such a 400 is a transcript problem and is surfaced as one.
          if (
            !AIExperimentsService.isToolSearchRejection(e) ||
            AIExperimentsService.hasSearchBlocks(anthropicMessages)
          ) {
            throw e;
          }
          this.toolSearchUnsupported = true;
          console.warn(
            `[AIExperiments] deferred tool loading rejected for ${model}; loading all tools`,
            e instanceof Error ? e.message : e,
          );
          res = await request(false);
        }
      } else {
        res = await request(false);
      }

      const usage = {
        input_tokens: res.usage?.input_tokens ?? 0,
        cache_read_input_tokens: res.usage?.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens:
          res.usage?.cache_creation_input_tokens ?? 0,
        output_tokens: res.usage?.output_tokens ?? 0,
      };
      console.log(
        `[AIExperiments] usage in=${usage.input_tokens} cache_read=${usage.cache_read_input_tokens} cache_write=${usage.cache_creation_input_tokens} out=${usage.output_tokens} msgs=${anthropicMessages.length} ctxChars=${context.length} msgChars=${JSON.stringify(anthropicMessages).length}`,
      );

      // A refusal is the model's answer, not a service failure — retrying
      // will not help, so tell the user instead of returning a 500.
      if (res.stop_reason === 'refusal') {
        console.warn('[AIExperiments] chat turn was refused by the model');
        return E.right({
          content:
            "I can't help with that request. Try rephrasing it, or ask about your API request, tests, or environment.",
          tool_calls: [],
          trace_id: res.id,
          usage,
        });
      }

      let content = '';
      const toolCalls: ChatResponse['tool_calls'] = [];
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
          // Deferred tools the search surfaced (shown to the user as a step).
          const result = block.content as
            { tool_references?: Array<{ tool_name?: string }> } | undefined;
          for (const ref of result?.tool_references ?? []) {
            if (ref.tool_name && !loadedTools.includes(ref.tool_name)) {
              loadedTools.push(ref.tool_name);
            }
          }
        }
      }
      content = content.trim();

      // The output ceiling cut the turn short: any tool_use blocks present are
      // complete (the API drops a partial one), but the model may claim actions
      // it never got to emit — tell the user instead of passing it off as a
      // finished reply.
      if (res.stop_reason === 'max_tokens') {
        console.error(
          '[AIExperiments] chat turn hit the output-token ceiling; the reply is truncated',
        );
        const notice =
          '⚠️ The reply was cut off (output limit reached) — some of the described actions may not have been applied.';
        content = content ? `${content}\n\n${notice}` : notice;
      }

      return E.right({
        content,
        tool_calls: toolCalls,
        trace_id: res.id,
        usage,
        // Echoed back verbatim by the client so discovered tools stay loaded
        // across the steps of this turn (only needed when tools were called).
        ...(toolCalls.length ? { assistant_content: res.content } : {}),
        ...(loadedTools.length ? { loaded_tools: loadedTools } : {}),
      });
    } catch (e) {
      // Surface the real Anthropic error so misconfig (bad/missing key,
      // unsupported model, network) is debuggable from the backend logs.
      console.error('[AIExperiments] chat failed:', e);
      // A 400 from the provider means the client sent a malformed transcript
      // (e.g. hand-crafted tool_use/tool_result sequences) — not our failure.
      if (e instanceof Anthropic.APIError && e.status === 400) {
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
}
