import Anthropic from '@anthropic-ai/sdk';
import {
  ChatConnection,
  createChatProvider,
} from 'src/ai-experiments/ai-experiments.providers';
import { OpenAIHttpError } from 'src/ai-experiments/ai-experiments.openai';

/**
 * How long one test call may take. Short on purpose: an admin is watching a
 * spinner, and a wrong endpoint usually fails by hanging rather than by
 * answering.
 */
const TEST_TIMEOUT_MS = 20_000;

/** Room for a one-word answer or a single tool call, and no more. */
const TEST_MAX_TOKENS = 64;

/**
 * A trivial tool offered on every test call.
 *
 * The chat is useless without function calling, and several models accept a
 * plain completion but reject the same request the moment it carries tools —
 * OpenAI's reasoning models do exactly that on Chat Completions unless
 * `reasoning_effort` is set. Offering one tool here means that failure surfaces
 * while the admin is still looking at the form, not in a user's first message.
 */
const PROBE_TOOL: Anthropic.ToolUnion = {
  name: 'report_status',
  description: 'Report that the connection is working.',
  input_schema: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Always the word "ok".' },
    },
    required: ['status'],
  },
} as Anthropic.ToolUnion;

/** Why a test failed, as a code the dashboard can translate. */
export type TestFailureReason =
  | 'auth'
  | 'not_found'
  | 'bad_request'
  | 'rate_limited'
  | 'provider_error'
  | 'unreachable'
  | 'unknown';

export type ConnectionTestResult = {
  model: string;
  ok: boolean;
  latencyMs: number;
  reason?: TestFailureReason;
  /** The provider's own words, redacted and truncated. */
  detail?: string;
};

const MAX_DETAIL_LENGTH = 300;

/**
 * Strips the credential out of a provider's error text.
 *
 * Some endpoints echo the request — headers included — in their error body. A
 * message is only worth showing if it cannot carry the key that produced it.
 */
const redactKey = (text: string, apiKey: string): string => {
  let safe = text;
  // Only the literal match needs a length floor, to stop a one-character key
  // blanking the whole message.
  if (apiKey.length >= 8) {
    safe = safe.split(apiKey).join('[redacted]');
  }
  // Key-shaped text goes regardless of what this connection stores: a local
  // runtime is usually given a placeholder like "none", and the body echoed
  // back can still carry a real credential from somewhere else.
  safe = safe.replace(/\b(sk|xoxb|ghp)-[A-Za-z0-9_-]{8,}/g, '[redacted]');
  return safe.length > MAX_DETAIL_LENGTH
    ? `${safe.slice(0, MAX_DETAIL_LENGTH)}…`
    : safe;
};

const messageFromBody = (body: unknown): string => {
  if (typeof body === 'string') return body;
  if (!body || typeof body !== 'object') return '';
  const error = (body as { error?: unknown }).error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  const message = (body as { message?: unknown }).message;
  return typeof message === 'string' ? message : '';
};

const reasonForStatus = (status: number): TestFailureReason => {
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'provider_error';
  if (status >= 400) return 'bad_request';
  return 'unknown';
};

const classify = (
  error: unknown,
  apiKey: string,
): { reason: TestFailureReason; detail?: string } => {
  if (error instanceof OpenAIHttpError) {
    return {
      reason: reasonForStatus(error.status),
      detail: redactKey(messageFromBody(error.body) || error.message, apiKey),
    };
  }

  if (error instanceof Anthropic.APIError) {
    const status = typeof error.status === 'number' ? error.status : 0;
    return {
      reason: status ? reasonForStatus(status) : 'unreachable',
      detail: redactKey(
        messageFromBody((error as { error?: unknown }).error) || error.message,
        apiKey,
      ),
    };
  }

  // A DNS failure, a refused connection, or the timeout above.
  const message = error instanceof Error ? error.message : String(error);
  return { reason: 'unreachable', detail: redactKey(message, apiKey) };
};

/**
 * Sends one minimal turn through the real provider path.
 *
 * It goes through `createChatProvider` rather than calling an endpoint
 * directly, so a pass means the chat's own code reached this model — not that
 * some parallel implementation of the same request did.
 */
export const testChatConnection = async (
  connection: ChatConnection,
): Promise<ConnectionTestResult> => {
  const startedAt = Date.now();

  // Retries are suppressed: the admin wants the first answer, and repeating a
  // rejected credential three times only lengthens the wait.
  const provider = createChatProvider({
    ...connection,
    // The instance timeout reaches here through the settings overrides, and it
    // is sized for a chat turn. A probe is not one: capped, never widened.
    timeoutMs: Math.min(
      connection.timeoutMs ?? TEST_TIMEOUT_MS,
      TEST_TIMEOUT_MS,
    ),
    maxRetries: 0,
  });

  try {
    await provider.send({
      system: [
        {
          text: 'You are a connection test. Reply with the single word "ok".',
          cacheable: false,
        },
      ],
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      tools: [PROBE_TOOL],
      maxTokens: TEST_MAX_TOKENS,
      deferNonCore: false,
    });

    // Any answer at all proves the credential, the endpoint, the model id and
    // the tool schema were all accepted. What the model actually said is not
    // the point, so it is deliberately not inspected.
    return {
      model: connection.model,
      ok: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      model: connection.model,
      ok: false,
      latencyMs: Date.now() - startedAt,
      ...classify(error, connection.apiKey),
    };
  }
};
