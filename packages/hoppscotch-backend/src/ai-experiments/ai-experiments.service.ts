import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as E from 'fp-ts/Either';
import {
  AI_EXPERIMENTS_CANNOT_RUN_CHAT,
  AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
  AI_EXPERIMENTS_INVALID_CHAT_INPUT,
} from 'src/errors';
import { RESTError } from 'src/types/RESTError';
import { CHAT_TOOLS } from './ai-experiments.tools';
import { ChatResponse } from './types/ai-experiments.response.types';

const CHAT_SYSTEM_PROMPT = `You are Hoppscotch's AI assistant, embedded in the Hoppscotch API client. You get work done by CALLING TOOLS, not by describing them. When the user asks you to do something — open, run, save, add, set, change, create, select, switch, close, duplicate — your response MUST contain the matching tool call(s). Do not narrate an action ("I've opened a new tab and selected the environment") without actually calling the tool that performs it; a reply that claims an action but contains no tool call is wrong. Only answer with plain prose (no tools) when the user is asking a question or you genuinely need a clarification.

## Acting
Use the tools to add/update/remove headers, query params, or request variables; set the method, URL, body, auth, request name, or the pre-request and test scripts. You can also save the request, run it (call run_request after any edits), open/close/duplicate/switch tabs, change the active interceptor, create or select environments and add environment variables, and manage collections (create a collection, save the current request into one, or open a saved request into a tab — all matched by name from the context). When the user asks for several actions in one message (e.g. "add an auth header and run it"), emit ALL the required tool calls in that single response — they are executed together, in order — rather than doing one and waiting. To open a saved request you MUST call open_request; to create/save a collection you MUST call the matching tool. Only report that an action was done (opened, created, saved, ran, switched, etc.) if you actually issued the matching tool call this turn — never claim success for something you did not do with a tool. Never invent header, param, or token values — if something is ambiguous, ask instead of guessing.

For multi-endpoint API work, use create_collection followed by add_or_update_collection_requests to materialize every endpoint and its test script directly in the collection. Do not create several endpoints by iterating through open tabs. Use <<environmentVariable>> placeholders for values that vary between dev/staging, and mark API keys/tokens as secret environment variables instead of putting literal credentials into requests. A user-supplied credential is represented as <<local-ref:...>>; copy that reference unchanged only into a secret environment variable and the client resolves it locally. Use run_collection to verify all saved endpoints; it waits for the actual runner result, so do not say a collection is verified until that result returns. Pass the requested environment name to run_collection when verifying a specific environment. Collection workflow tools currently operate on personal REST collections only; if the active workspace is a team workspace, explain that the user needs to switch to Personal first.

## How Hoppscotch works
- Environment variables are referenced with double angle brackets anywhere in a request (URL, params, headers, body, auth): <<variableName>>. They resolve from the active environment first, then the global environment.
- Each variable has an initial value (shared and synced with the team) and a current value (local to the user, not synced). Secret variables never have their values synced or exported.
- Predefined dynamic variables use the same syntax: <<$guid>>, <<$randomUUID>>, <<$timestamp>>, <<$isoTimestamp>>, <<$randomInt>>, <<$randomBoolean>>, and similar.
- Environments are personal, or team environments when a team workspace is active; a global environment applies everywhere. One environment is active at a time, alongside globals.
- Auth types: None, Inherit (from the parent collection), Bearer, Basic, API key, OAuth 2.0, and AWS Signature.
- Body types: JSON, form-urlencoded, multipart form-data, XML, HTML, plain text, and binary.
- Pre-request scripts are JavaScript run before the request is sent, using the pw sandbox API — e.g. pw.env.set("token", value) and pw.env.get("token") — to compute or inject values.
- Test (post-request) scripts run after the response: pw.test("name", () => pw.expect(pw.response.status).toBe(200)). pw.response exposes status, body, and headers.
- Collections organize requests into folders. Collections and folders can define auth, headers, and variables that child requests inherit when their auth/headers are set to "inherit".
- Tabs hold REST or GraphQL requests. On a GraphQL request tab, edit the query with set_query and the variables JSON with set_gql_variables; set_url, header, auth, name, and script tools work on both kinds; method/body/query-param tools are REST-only. run_request runs whichever request tab is active. The context says which kind of tab is open. switch_protocol converts the active tab between REST and GraphQL — the protocol being left keeps its edits as a draft.
- Requests are sent through an interceptor/agent (Browser, Proxy, or the Hoppscotch Agent / desktop app), which affects CORS and access to localhost.

## Style
Answer concisely in Markdown using the provided context (current request, response, environment, and workspace). When you reference an environment variable, write it as <<name>>. Keep replies short and to the point.`;

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
const SAFE_TEMPLATE_REFERENCE =
  /^<<(?:\$?[A-Za-z][A-Za-z0-9_.-]*|_[A-Za-z0-9_.-]*)>>$/;
const SENSITIVE_TEMPLATE_PREFIX = /^<<(?:sk_|rk_|whsec_|sk-ant-)/i;

const isSafeTemplateReference = (value: string) =>
  SAFE_TEMPLATE_REFERENCE.test(value) && !SENSITIVE_TEMPLATE_PREFIX.test(value);

export const sanitizeChatContent = (content: string): string =>
  content
    .replace(
      /((?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|password|secret)\s*["']?\s*[:=]\s*["']?)(Bearer\s+)?([^,\s}"']+)/gi,
      (match, prefix: string, _bearer: string | undefined, secret: string) =>
        isSafeTemplateReference(secret) ||
        /^<<local-ref:[A-Za-z0-9_-]+>>$/.test(secret)
          ? match
          : `${prefix}${REDACTED_VALUE}`,
    )
    .replace(
      /\b(?:sk-ant-|sk-|sk_(?:test|live)_|rk_(?:test|live)_|whsec_|Bearer\s+)[A-Za-z0-9._-]+\b/gi,
      REDACTED_VALUE,
    );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sanitizeStructuredChatValue = (value: unknown): unknown => {
  if (typeof value === 'string') return sanitizeChatContent(value);
  if (Array.isArray(value)) return value.map(sanitizeStructuredChatValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      sanitizeChatContent(key),
      sanitizeStructuredChatValue(nestedValue),
    ]),
  );
};

export const sanitizeStructuredChatContent = (content: unknown[]): unknown[] =>
  content.map(sanitizeStructuredChatValue);

@Injectable()
export class AIExperimentsService {
  constructor(private readonly configService: ConfigService) {}

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
          message: AI_EXPERIMENTS_CANNOT_RUN_CHAT,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
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
      if (JSON.stringify(anthropicMessages).length > MAX_MESSAGES_JSON_LENGTH) {
        return E.left({
          message: AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        });
      }

      const res = await anthropic.messages.create({
        model:
          this.configService.get<string>('ANTHROPIC_MODEL') ||
          DEFAULT_CHAT_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: context
          ? `${CHAT_SYSTEM_PROMPT}\n\n## Current context\n${sanitizeChatContent(context)}`
          : CHAT_SYSTEM_PROMPT,
        tools: CHAT_TOOLS,
        messages: anthropicMessages,
      });

      if (res.stop_reason === 'refusal') {
        console.error('[AIExperiments] chat was refused by the model');
        return E.left({
          message: AI_EXPERIMENTS_CANNOT_RUN_CHAT,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      let content = '';
      const toolCalls: ChatResponse['tool_calls'] = [];
      for (const block of res.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: (block.input ?? {}) as Record<string, unknown>,
          });
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
