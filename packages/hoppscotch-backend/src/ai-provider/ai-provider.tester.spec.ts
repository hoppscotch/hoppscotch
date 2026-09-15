import Anthropic from '@anthropic-ai/sdk';
import { OpenAIHttpError } from 'src/ai-experiments/ai-experiments.openai';
import {
  ChatConnection,
  createChatProvider,
} from 'src/ai-experiments/ai-experiments.providers';
import { testChatConnection } from './ai-provider.tester';

jest.mock('src/ai-experiments/ai-experiments.providers', () => ({
  ...jest.requireActual('src/ai-experiments/ai-experiments.providers'),
  createChatProvider: jest.fn(),
}));

const mockedCreate = createChatProvider as jest.MockedFunction<
  typeof createChatProvider
>;

const KEY = 'sk-live-abcdefghijklmnop';

const connection = (over: Partial<ChatConnection> = {}): ChatConnection =>
  ({
    preset: 'openai',
    dialect: 'openai',
    auth: 'api-key',
    apiKey: KEY,
    model: 'gpt-5.6-luna',
    capabilities: {
      toolSearch: false,
      promptCaching: false,
      cacheUsageCounters: true,
    },
    ...over,
  }) as ChatConnection;

/** Installs a provider whose single turn resolves or rejects as given. */
const withProvider = (send: jest.Mock) => {
  mockedCreate.mockImplementation(
    () =>
      ({
        model: 'gpt-5.6-luna',
        capabilities: {
          toolSearch: false,
          promptCaching: false,
          cacheUsageCounters: true,
        },
        send,
        isDeferralRejection: () => false,
        isBadRequest: () => false,
      }) as never,
  );
  return send;
};

beforeEach(() => mockedCreate.mockReset());

describe('testChatConnection', () => {
  test('reports a working connection', async () => {
    withProvider(jest.fn().mockResolvedValue({ content: 'ok', toolCalls: [] }));

    const result = await testChatConnection(connection());

    expect(result.ok).toBe(true);
    expect(result.model).toBe('gpt-5.6-luna');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.reason).toBeUndefined();
  });

  test('offers a tool, so a model that refuses tools fails here', async () => {
    // The chat is useless without function calling, and some models accept a
    // bare completion but reject the same request once it carries tools.
    const send = withProvider(jest.fn().mockResolvedValue({ content: 'ok' }));

    await testChatConnection(connection());

    expect(send.mock.calls[0][0].tools).toHaveLength(1);
  });

  test('does not retry, so a rejected key fails once and quickly', async () => {
    withProvider(jest.fn().mockResolvedValue({ content: 'ok' }));

    await testChatConnection(connection());

    expect(mockedCreate.mock.calls[0][0].maxRetries).toBe(0);
  });

  test('keeps a connection-specific timeout rather than overriding it', async () => {
    withProvider(jest.fn().mockResolvedValue({ content: 'ok' }));

    await testChatConnection(connection({ timeoutMs: 5_000 }));

    expect(mockedCreate.mock.calls[0][0].timeoutMs).toBe(5_000);
  });

  test.each([
    [401, 'auth'],
    [403, 'auth'],
    [404, 'not_found'],
    [400, 'bad_request'],
    [429, 'rate_limited'],
    [500, 'provider_error'],
  ])('maps an OpenAI-dialect %i onto "%s"', async (status, reason) => {
    withProvider(
      jest.fn().mockRejectedValue(new OpenAIHttpError(status, { error: {} })),
    );

    expect((await testChatConnection(connection())).reason).toBe(reason);
  });

  test("passes through the provider's own explanation", async () => {
    withProvider(
      jest.fn().mockRejectedValue(
        new OpenAIHttpError(400, {
          error: { message: "Unsupported value: 'tools' with this model" },
        }),
      ),
    );

    const result = await testChatConnection(connection());

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("Unsupported value: 'tools'");
  });

  test('never echoes the key back, even when the provider does', async () => {
    // Some endpoints quote the offending request, headers included.
    withProvider(
      jest.fn().mockRejectedValue(
        new OpenAIHttpError(401, {
          error: { message: `Incorrect API key provided: ${KEY}` },
        }),
      ),
    );

    const result = await testChatConnection(connection());

    expect(result.detail).not.toContain(KEY);
    expect(result.detail).toContain('[redacted]');
  });

  test('redacts a key-shaped string it was not given', async () => {
    withProvider(
      jest.fn().mockRejectedValue(
        new OpenAIHttpError(401, {
          error: { message: 'bad key sk-other-aaaaaaaaaaaaaaaa' },
        }),
      ),
    );

    expect((await testChatConnection(connection())).detail).not.toContain(
      'sk-other',
    );
  });

  test('truncates a provider that answers with a wall of text', async () => {
    withProvider(
      jest
        .fn()
        .mockRejectedValue(
          new OpenAIHttpError(400, { error: { message: 'x'.repeat(5000) } }),
        ),
    );

    expect(
      (await testChatConnection(connection())).detail!.length,
    ).toBeLessThan(400);
  });

  test('classifies an Anthropic SDK error by its status', async () => {
    const error = Object.create(Anthropic.APIError.prototype) as Error & {
      status: number;
      error: unknown;
    };
    error.message = 'not found';
    error.status = 404;
    error.error = { error: { message: 'model: claude-nope' } };
    withProvider(jest.fn().mockRejectedValue(error));

    const result = await testChatConnection(
      connection({ dialect: 'anthropic' }),
    );

    expect(result.reason).toBe('not_found');
    expect(result.detail).toContain('claude-nope');
  });

  test('calls an endpoint that answers nothing "unreachable"', async () => {
    withProvider(jest.fn().mockRejectedValue(new Error('fetch failed')));

    const result = await testChatConnection(connection());

    expect(result.reason).toBe('unreachable');
    expect(result.detail).toContain('fetch failed');
  });

  test('still reports how long a failure took', async () => {
    withProvider(jest.fn().mockRejectedValue(new Error('fetch failed')));

    expect(
      (await testChatConnection(connection())).latencyMs,
    ).toBeGreaterThanOrEqual(0);
  });
});
