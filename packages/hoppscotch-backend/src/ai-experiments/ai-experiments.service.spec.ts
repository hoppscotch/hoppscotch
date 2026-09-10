import { mockDeep, mockReset } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as E from 'fp-ts/Either';
import {
  AI_EXPERIMENTS_CANNOT_RUN_CHAT,
  AI_EXPERIMENTS_CHAT_DISABLED,
  AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
  AI_EXPERIMENTS_INVALID_CHAT_INPUT,
} from 'src/errors';
import {
  AIExperimentsService,
  sanitizeChatContent,
} from './ai-experiments.service';
import {
  buildChatTools,
  CHAT_TOOLS,
  CORE_TOOL_NAMES,
} from './ai-experiments.tools';

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  const ctor: any = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
  // The service checks `e instanceof Anthropic.APIError` in its catch path.
  ctor.APIError = class MockAPIError extends Error {
    constructor(public status: number) {
      super(`api error ${status}`);
    }
  };
  return ctor;
});

// The mocked module's attached error class (see the factory above).
const MockAPIError = (Anthropic as any).APIError;

const mockConfigService = mockDeep<ConfigService>();

const aiExperimentsService = new AIExperimentsService(mockConfigService);

const configWithKey = (model?: string) => {
  mockConfigService.get.mockImplementation((key: string) => {
    if (key === 'ANTHROPIC_API_KEY') return 'test-api-key';
    if (key === 'ANTHROPIC_MODEL') return model;
    if (key === 'AI_CHAT_ENABLED') return 'true';
    return undefined;
  });
};

beforeEach(() => {
  mockReset(mockConfigService);
  mockCreate.mockReset();
});

describe('AIExperimentsService', () => {
  describe('chat', () => {
    test('should resolve left when ANTHROPIC_API_KEY is not configured', async () => {
      // Chat is switched on, so only the missing key can reject the turn.
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AI_CHAT_ENABLED') return 'true';
        return undefined;
      });

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toEqualLeft(
        expect.objectContaining({
          message: AI_EXPERIMENTS_CHAT_DISABLED,
          statusCode: 503,
        }),
      );
    });

    test('should resolve left when AI chat is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_API_KEY') return 'test-api-key';
        if (key === 'AI_CHAT_ENABLED') return 'false';
        return undefined;
      });

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toEqualLeft(
        expect.objectContaining({ message: AI_EXPERIMENTS_CHAT_DISABLED }),
      );
    });

    test('should map text and tool_use blocks into the chat response', async () => {
      configWithKey();
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        stop_reason: 'tool_use',
        content: [
          { type: 'text', text: 'Setting the method. ' },
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'set_method',
            input: { method: 'POST' },
          },
        ],
      });

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'make it a POST' }],
        '',
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isLeft(result)) return;
      expect(result.right).toEqual(
        expect.objectContaining({
          content: 'Setting the method.',
          tool_calls: [
            { id: 'toolu_1', name: 'set_method', input: { method: 'POST' } },
          ],
          trace_id: 'msg_123',
        }),
      );
    });

    describe('AI chat tool contract', () => {
      test('exposes collection building and verification tools', () => {
        expect(CHAT_TOOLS.map((tool) => tool.name)).toEqual(
          expect.arrayContaining([
            'add_or_update_collection_requests',
            'run_collection',
            'create_team',
            'switch_workspace',
            'rename_team',
            'set_collection_properties',
            'set_request_description',
            'set_collection_description',
            'publish_documentation',
            'unpublish_documentation',
            'create_mock_server',
            'list_mock_servers',
            'update_mock_server',
            'delete_mock_server',
            'get_graphql_schema',
            'list_collections',
          ]),
        );
      });
    });

    test('should drop empty messages, normalize roles, and pass tools + context', async () => {
      configWithKey();
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });

      await aiExperimentsService.chat(
        [
          { role: 'user', content: '   ' },
          { role: 'system', content: 'sneaky role' },
          { role: 'assistant', content: [] },
          { role: 'assistant', content: 'earlier reply' },
          { role: 'user', content: 'question' },
        ],
        'CTX',
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: buildChatTools(true),
          system: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining('## Current context\nCTX'),
              cache_control: { type: 'ephemeral' },
            }),
          ]),
          messages: [
            { role: 'user', content: 'sneaky role' },
            { role: 'assistant', content: 'earlier reply' },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'question',
                  cache_control: { type: 'ephemeral' },
                },
              ],
            },
          ],
        }),
      );
    });

    test('should redact credentials from context and text messages', async () => {
      configWithKey();
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });

      await aiExperimentsService.chat(
        [
          {
            role: 'user',
            content: 'Use token sk-proj-abcdefghijklmnopqrstuvwxyz',
          },
        ],
        'Authorization: Bearer request-secret',
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining('Authorization: Bearer [REDACTED]'),
            }),
          ]),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Use token [REDACTED]',
                  cache_control: { type: 'ephemeral' },
                },
              ],
            },
          ],
        }),
      );
    });

    test('should redact credentials nested in structured chat content', async () => {
      configWithKey();
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });

      await aiExperimentsService.chat(
        [
          {
            role: 'user',
            content: [
              {
                type: 'tool_use',
                id: 'toolu_1',
                name: 'add_or_update_headers',
                input: {
                  headers: [
                    {
                      key: 'Authorization',
                      value: 'Bearer sk_test_51StructuredSecret',
                    },
                  ],
                },
              },
              {
                type: 'tool_result',
                tool_use_id: 'toolu_1',
                content: 'x-api-key=structured-secret',
              },
            ],
          },
        ],
        '',
      );

      const request = mockCreate.mock.calls[0][0];
      const serializedMessages = JSON.stringify(request.messages);

      expect(serializedMessages).toContain('[REDACTED]');
      expect(serializedMessages).not.toContain('sk_test_51StructuredSecret');
      expect(serializedMessages).not.toContain('structured-secret');
    });

    test('should use the ANTHROPIC_MODEL override when configured', async () => {
      configWithKey('claude-opus-5');
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });

      await aiExperimentsService.chat([{ role: 'user', content: 'hey' }], '');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-5' }),
      );
    });

    test('should turn a model refusal into a plain reply, not a failure', async () => {
      configWithKey();
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        stop_reason: 'refusal',
        content: [],
      });

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isLeft(result)) return;
      expect(result.right).toEqual(
        expect.objectContaining({
          content: expect.stringContaining("can't help"),
          tool_calls: [],
          trace_id: 'msg_123',
        }),
      );
    });

    test('should resolve left when the provider request throws', async () => {
      configWithKey();
      mockCreate.mockRejectedValue(new Error('network down'));

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(E.isLeft(result)).toBe(true);
      expect(result).toEqualLeft(
        expect.objectContaining({ message: AI_EXPERIMENTS_CANNOT_RUN_CHAT }),
      );
    });

    test('should report a bad request when nothing remains after filtering', async () => {
      configWithKey();

      const result = await aiExperimentsService.chat(
        [
          { role: 'user', content: '   ' },
          null as unknown as { role: string; content: string },
          { role: 'assistant', content: [] },
        ],
        '',
      );

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toEqualLeft(
        expect.objectContaining({
          message: AI_EXPERIMENTS_INVALID_CHAT_INPUT,
          statusCode: 400,
        }),
      );
    });

    test('should reject an oversized transcript before calling the provider', async () => {
      configWithKey();

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'x'.repeat(500_000) }],
        '',
      );

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toEqualLeft(
        expect.objectContaining({
          message: AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
          statusCode: 413,
        }),
      );
    });

    test('should append a truncation notice when the turn hits the output ceiling', async () => {
      configWithKey();
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        stop_reason: 'max_tokens',
        content: [
          { type: 'text', text: 'Setting the body and running it.' },
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'set_body',
            input: { body: '{}' },
          },
        ],
      });

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'update the body and run it' }],
        '',
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.content).toContain('Setting the body');
        expect(result.right.content).toContain('cut off');
        expect(result.right.tool_calls).toHaveLength(1);
      }
    });

    test('should map a provider 400 to a bad-request error', async () => {
      configWithKey();
      mockCreate.mockRejectedValue(new MockAPIError(400));

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(result).toEqualLeft(
        expect.objectContaining({
          message: AI_EXPERIMENTS_INVALID_CHAT_INPUT,
          statusCode: 400,
        }),
      );
    });
  });

  describe('deferred tool loading', () => {
    test('loads only the core tools up front and defers the rest behind tool search', () => {
      const tools = buildChatTools(true) as Array<Record<string, unknown>>;
      expect(tools[0]).toEqual({
        type: 'tool_search_tool_regex_20251119',
        name: 'tool_search_tool_regex',
      });
      const byName = new Map(tools.slice(1).map((t) => [t.name, t]));
      expect(byName.size).toBe(CHAT_TOOLS.length);
      for (const name of CORE_TOOL_NAMES) {
        expect(byName.get(name)?.defer_loading).toBeUndefined();
      }
      expect(byName.get('create_mock_server')?.defer_loading).toBe(true);
      expect(byName.get('switch_workspace')?.defer_loading).toBe(true);
      // The fallback layout is the plain, fully loaded contract.
      expect(buildChatTools(false)).toEqual(CHAT_TOOLS);
    });

    test('falls back to the fully loaded tool set when the provider rejects deferral', async () => {
      configWithKey();
      const rejection = new MockAPIError(400);
      rejection.message =
        '400 {"type":"error","error":{"type":"invalid_request_error","message":"tools.0.type: tool_search_tool_regex_20251119 is not supported for this model"}}';
      rejection.error = {
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message:
            'tools.0.type: tool_search_tool_regex_20251119 is not supported for this model',
        },
      };
      mockCreate.mockRejectedValueOnce(rejection).mockResolvedValueOnce({
        id: 'msg_fallback',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });

      const service = new AIExperimentsService(mockConfigService);
      const result = await service.chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(E.isRight(result)).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockCreate.mock.calls[0][0].tools[0]).toMatchObject({
        type: 'tool_search_tool_regex_20251119',
      });
      expect(mockCreate.mock.calls[1][0].tools).toEqual(CHAT_TOOLS);

      // The rejection is remembered: the next turn skips the failing attempt.
      mockCreate.mockResolvedValueOnce({
        id: 'msg_next',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'again' }],
      });
      await service.chat([{ role: 'user', content: 'hello again' }], '');
      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockCreate.mock.calls[2][0].tools).toEqual(CHAT_TOOLS);
    });

    test('does not fall back on a transcript error that merely names a search block', async () => {
      configWithKey();
      const rejection = new MockAPIError(400);
      rejection.message =
        'messages.1.content.2.tool_search_tool_result.tool_use_id: Field required';
      mockCreate.mockRejectedValueOnce(rejection);

      const service = new AIExperimentsService(mockConfigService);
      const result = await service.chat(
        [
          { role: 'user', content: 'go' },
          {
            role: 'assistant',
            content: [
              {
                type: 'server_tool_use',
                id: 'srvtoolu_1',
                name: 'tool_search_tool_regex',
                input: { pattern: 'mock' },
              },
            ],
          },
          { role: 'user', content: 'next' },
        ],
        '',
      );

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(result).toEqualLeft(
        expect.objectContaining({ message: AI_EXPERIMENTS_INVALID_CHAT_INPUT }),
      );

      // Deferral stays enabled for the next call.
      mockCreate.mockResolvedValueOnce({
        id: 'msg_ok',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'ok' }],
      });
      await service.chat([{ role: 'user', content: 'hello' }], '');
      expect(mockCreate.mock.calls[1][0].tools[0]).toMatchObject({
        type: 'tool_search_tool_regex_20251119',
      });
      expect(mockCreate.mock.calls[1][0].system[0].text).toContain(
        '## Finding tools',
      );
    });

    test('drops the tool-search prompt section on the fully loaded fallback', async () => {
      configWithKey();
      const rejection = new MockAPIError(400);
      rejection.message = 'tools.0: defer_loading is not supported';
      mockCreate.mockRejectedValueOnce(rejection).mockResolvedValueOnce({
        id: 'msg_fallback',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });
      const service = new AIExperimentsService(mockConfigService);
      await service.chat([{ role: 'user', content: 'hello' }], '');
      expect(mockCreate.mock.calls[0][0].system[0].text).toContain(
        '## Finding tools',
      );
      expect(mockCreate.mock.calls[1][0].system[0].text).not.toContain(
        '## Finding tools',
      );
    });

    test('reports discovered tools and returns the assistant content for echoing', async () => {
      configWithKey();
      const content = [
        { type: 'text', text: 'Let me find the mock tools.' },
        {
          type: 'server_tool_use',
          id: 'srvtoolu_1',
          name: 'tool_search_tool_regex',
          input: { pattern: 'mock' },
        },
        {
          type: 'tool_search_tool_result',
          tool_use_id: 'srvtoolu_1',
          content: {
            type: 'tool_search_tool_search_result',
            tool_references: [
              { type: 'tool_reference', tool_name: 'create_mock_server' },
              { type: 'tool_reference', tool_name: 'list_mock_servers' },
            ],
          },
        },
        {
          type: 'tool_use',
          id: 'toolu_9',
          name: 'create_mock_server',
          input: { collection: 'Orders' },
        },
      ];
      mockCreate.mockResolvedValue({
        id: 'msg_search',
        stop_reason: 'tool_use',
        content,
      });

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'mock the Orders collection' }],
        '',
      );

      expect(E.isRight(result)).toBe(true);
      if (E.isLeft(result)) return;
      expect(result.right.tool_calls).toEqual([
        {
          id: 'toolu_9',
          name: 'create_mock_server',
          input: { collection: 'Orders' },
        },
      ]);
      expect(result.right.loaded_tools).toEqual([
        'create_mock_server',
        'list_mock_servers',
      ]);
      expect(result.right.assistant_content).toBe(content);
    });

    test('never rewrites search-result or thinking blocks in echoed history', async () => {
      configWithKey();
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'ok' }],
      });
      const searchBlock = {
        type: 'tool_search_tool_result',
        tool_use_id: 'srvtoolu_1',
        content: {
          type: 'tool_search_tool_search_result',
          tool_references: [
            { type: 'tool_reference', tool_name: 'x_api_key_tool' },
          ],
        },
      };
      const thinkingBlock = {
        type: 'thinking',
        thinking: 'api_key=sk_live_secretValue123',
        signature: 'sig',
      };
      await aiExperimentsService.chat(
        [
          { role: 'user', content: 'go' },
          { role: 'assistant', content: [thinkingBlock, searchBlock] },
          { role: 'user', content: 'next' },
        ],
        '',
      );
      const sent = mockCreate.mock.calls[0][0].messages[1].content;
      expect(sent[0]).toEqual(thinkingBlock);
      expect(sent[1]).toEqual(searchBlock);
    });
  });

  describe('prompt caching layout', () => {
    test('marks the static prompt, the context, and the transcript tail as cache breakpoints', async () => {
      configWithKey();
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
        usage: {
          input_tokens: 10,
          cache_read_input_tokens: 4000,
          cache_creation_input_tokens: 0,
          output_tokens: 5,
        },
      });

      const result = await aiExperimentsService.chat(
        [
          { role: 'user', content: 'first' },
          { role: 'assistant', content: [{ type: 'text', text: 'reply' }] },
          {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 't1', content: 'ok' },
            ],
          },
        ],
        'CTX',
      );

      const request = mockCreate.mock.calls[0][0];
      expect(request.system).toHaveLength(2);
      expect(request.system[0].cache_control).toEqual({ type: 'ephemeral' });
      expect(request.system[1].cache_control).toEqual({ type: 'ephemeral' });
      // Only the final block of the final message carries the tail breakpoint.
      expect(request.messages[0].content).toBe('first');
      expect(request.messages[2].content[0].cache_control).toEqual({
        type: 'ephemeral',
      });
      expect(E.isRight(result)).toBe(true);
      if (E.isLeft(result)) return;
      expect(result.right.usage).toEqual({
        input_tokens: 10,
        cache_read_input_tokens: 4000,
        cache_creation_input_tokens: 0,
        output_tokens: 5,
      });
    });
  });

  describe('sanitizeChatContent', () => {
    test('redacts common credential fields and bearer tokens', () => {
      expect(
        sanitizeChatContent(
          'Authorization: Bearer request-secret\nx-api-key=key-secret\nbody={"password":"hunter2"}',
        ),
      ).toBe(
        'Authorization: Bearer [REDACTED]\nx-api-key=[REDACTED]\nbody={"password":"[REDACTED]"}',
      );
    });

    test('keeps JSON structure when a keyword is a field name, and redacts multi-part values', () => {
      expect(
        sanitizeChatContent(
          '{"secret":true,"password":{"type":"string"},"cookie":"a=1; b=2"}',
        ),
      ).toBe(
        '{"secret":true,"password":{"type":"string"},"cookie":"[REDACTED]"}',
      );
      expect(
        sanitizeChatContent(
          'Authorization: Basic dXNlcjpwYXNz\nCookie: a=1; b=2',
        ),
      ).toBe('Authorization: Basic [REDACTED]\nCookie: [REDACTED]');
    });

    test('redacts bare JWTs and cloud keys but leaves ordinary prose alone', () => {
      expect(
        sanitizeChatContent(
          'how do I set a bearer token? use eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghij or AKIAIOSFODNN7EXAMPLE',
        ),
      ).toBe('how do I set a bearer token? use [REDACTED] or [REDACTED]');
      expect(sanitizeChatContent('GET /sk-123/items for locale sk-SK')).toBe(
        'GET /sk-123/items for locale sk-SK',
      );
    });

    test('keeps GraphQL SDL type references after sensitive field names', () => {
      expect(
        sanitizeChatContent(
          'input LoginInput { email: String!, password: String!, token: [ID!]! }\npassword: hunter2',
        ),
      ).toBe(
        'input LoginInput { email: String!, password: String!, token: [ID!]! }\npassword: [REDACTED]',
      );
    });

    test('stays linear on adversarial whitespace runs', () => {
      const started = Date.now();
      sanitizeChatContent(`secret${' '.repeat(200_000)}x`);
      expect(Date.now() - started).toBeLessThan(500);
    });

    test('redacts Stripe API keys outside named credential fields', () => {
      expect(
        sanitizeChatContent('Use sk_test_51StripeSecretToken for this request'),
      ).toBe('Use [REDACTED] for this request');
    });

    test('preserves opaque client-local secret references', () => {
      expect(
        sanitizeChatContent(
          'STRIPE_API_KEY=<<local-ref:secret_1>> Authorization: Bearer <<local-ref:secret_2>>',
        ),
      ).toBe(
        'STRIPE_API_KEY=<<local-ref:secret_1>> Authorization: Bearer <<local-ref:secret_2>>',
      );
    });

    test('preserves safe environment placeholders', () => {
      expect(
        sanitizeChatContent('Authorization: Bearer <<stripeSecretKey>>'),
      ).toBe('Authorization: Bearer <<stripeSecretKey>>');
    });
  });
});
