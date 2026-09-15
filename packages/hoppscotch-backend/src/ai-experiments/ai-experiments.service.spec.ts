import Anthropic from '@anthropic-ai/sdk';
import * as E from 'fp-ts/Either';
import {
  AI_EXPERIMENTS_CANNOT_RUN_CHAT,
  AI_EXPERIMENTS_CHAT_DISABLED,
  AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
  AI_EXPERIMENTS_INVALID_CHAT_INPUT,
  AI_EXPERIMENTS_MODEL_UNAVAILABLE,
} from 'src/errors';
import {
  AIExperimentsService,
  sanitizeChatContent,
} from './ai-experiments.service';
import { AIProviderService } from 'src/ai-provider/ai-provider.service';
import {
  buildChatTools,
  buildSearchableChatTools,
  CHAT_TOOLS,
  collectUsedToolNames,
  CORE_TOOL_NAMES,
  findToolsByQuery,
} from './ai-experiments.tools';
import {
  applyOverrides,
  connectionFromPreset,
  describePresets,
  listPresets,
  ProviderPreset,
  requiresBaseURLFor,
  validateModelForPreset,
} from './ai-experiments.providers';
import { AISettingsService } from 'src/ai-provider/ai-settings.service';

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

// The admin dashboard is the only source of connections, so every turn these
// tests run is served by whatever this resolver hands back.
const mockResolveForChat = jest.fn();
const mockProviderService = {
  resolveForChat: mockResolveForChat,
} as unknown as AIProviderService;

// The instance toggle and the tuning both live in the database now.
const mockIsEnabled = jest.fn();
const mockOverrides = jest.fn();
const mockSettingsService = {
  isEnabled: mockIsEnabled,
  overrides: mockOverrides,
} as unknown as AISettingsService;

const newService = () =>
  new AIExperimentsService(mockProviderService, mockSettingsService);

const aiExperimentsService = newService();

/**
 * Registers a dashboard connection for the turn.
 *
 * Built through `connectionFromPreset` rather than hand-rolled, so the preset's
 * real dialect, auth style and capabilities are what the service sees — a
 * literal would let a test pass against a shape the resolver never produces.
 */
const connectedTo = (
  model = 'claude-sonnet-5',
  opts: {
    preset?: ProviderPreset;
    baseURL?: string;
    overrides?: Record<string, unknown>;
  } = {},
) => {
  mockIsEnabled.mockResolvedValue(true);
  mockOverrides.mockResolvedValue(opts.overrides ?? {});
  // Mirrors the real resolver's contract: a model this connection does not
  // offer is refused rather than quietly served by the configured one.
  mockResolveForChat.mockImplementation(
    (_connectionID?: string, requestedModel?: string) =>
      Promise.resolve(
        requestedModel && requestedModel !== model
          ? E.left('ai_provider/model_rejected')
          : E.right(
              connectionFromPreset(opts.preset ?? 'anthropic', {
                apiKey: 'test-api-key',
                baseURL: opts.baseURL,
                model,
              }),
            ),
      ),
  );
};

beforeEach(() => {
  mockCreate.mockReset();
  // Reset here rather than at declaration: a resolver left over from the last
  // test would serve the next one a connection it never asked for.
  mockResolveForChat.mockReset();
  mockResolveForChat.mockResolvedValue(E.left('ai_provider/not_found'));
  mockIsEnabled.mockReset();
  mockIsEnabled.mockResolvedValue(true);
  mockOverrides.mockReset();
  mockOverrides.mockResolvedValue({});
});

describe('AIExperimentsService', () => {
  describe('chat', () => {
    test('resolves left when no provider is registered', async () => {
      // Chat is switched on, so only the missing connection can reject the turn.
      mockIsEnabled.mockResolvedValue(true);

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
      connectedTo();
      mockIsEnabled.mockResolvedValue(false);

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
      connectedTo();
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
      connectedTo();
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
      connectedTo();
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
      connectedTo();
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
      connectedTo('claude-opus-5');
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
      connectedTo();
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
      connectedTo();
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
      connectedTo();

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
      connectedTo();

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
      connectedTo();
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
      connectedTo();
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

    test('falls back to the local tool finder when the provider rejects deferral', async () => {
      connectedTo();
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

      const service = newService();
      const result = await service.chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(E.isRight(result)).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockCreate.mock.calls[0][0].tools[0]).toMatchObject({
        type: 'tool_search_tool_regex_20251119',
      });
      // Not the full 44: a provider without server-side search gets our own
      // finder plus the core set, because 44 is past the selection cliff.
      const fallbackTools = mockCreate.mock.calls[1][0].tools;
      expect(fallbackTools[0]).toMatchObject({ name: 'find_tools' });
      expect(fallbackTools).toHaveLength(CORE_TOOL_NAMES.size + 1);

      // The rejection is remembered: the next turn skips the failing attempt.
      mockCreate.mockResolvedValueOnce({
        id: 'msg_next',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'again' }],
      });
      await service.chat([{ role: 'user', content: 'hello again' }], '');
      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockCreate.mock.calls[2][0].tools[0]).toMatchObject({
        name: 'find_tools',
      });
    });

    test('does not fall back on a transcript error that merely names a search block', async () => {
      connectedTo();
      const rejection = new MockAPIError(400);
      rejection.message =
        'messages.1.content.2.tool_search_tool_result.tool_use_id: Field required';
      mockCreate.mockRejectedValueOnce(rejection);

      const service = newService();
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

    test('swaps in the local finder prompt when native search is rejected', async () => {
      connectedTo();
      const rejection = new MockAPIError(400);
      rejection.message = 'tools.0: defer_loading is not supported';
      mockCreate.mockRejectedValueOnce(rejection).mockResolvedValueOnce({
        id: 'msg_fallback',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });
      const service = newService();
      await service.chat([{ role: 'user', content: 'hello' }], '');
      expect(mockCreate.mock.calls[0][0].system[0].text).toContain(
        '## Finding tools',
      );
      expect(mockCreate.mock.calls[1][0].system[0].text).toContain(
        'find_tools',
      );
      // Both mechanisms have a "Finding tools" section; what must not survive
      // is the instruction to use Anthropic's search tool, which is gone.
      expect(mockCreate.mock.calls[1][0].system[0].text).not.toContain(
        'tool_search_tool_regex',
      );
    });

    test('reports discovered tools and returns the assistant content for echoing', async () => {
      connectedTo();
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
      connectedTo();
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
      connectedTo();
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

  describe('knowing which presets need an endpoint', () => {
    test('every preset either carries an endpoint or insists on one', () => {
      // The invariant the whole feature rests on: a connection must never be
      // savable with nowhere to send the credential. Deriving this from the
      // presence of a hint instead let `openai` save and then fail every turn,
      // and let `custom` fall through to the Anthropic SDK's own default.
      for (const preset of listPresets()) {
        const connection = connectionFromPreset(preset, {
          apiKey: 'k',
          model: 'm',
        });
        expect(!!connection.baseURL || requiresBaseURLFor(preset)).toBe(true);
      }
    });

    test('openai resolves to the vendor endpoint on its own', () => {
      expect(
        connectionFromPreset('openai', { apiKey: 'k', model: 'gpt-5.6-luna' })
          .baseURL,
      ).toBe('https://api.openai.com/v1');
    });

    test('custom has nowhere to default to, so it demands an endpoint', () => {
      expect(requiresBaseURLFor('custom')).toBe(true);
      expect(
        connectionFromPreset('custom', { apiKey: 'k', model: 'm' }).baseURL,
      ).toBeUndefined();
    });

    test('the form is told exactly what the validator will enforce', () => {
      for (const described of describePresets()) {
        expect(described.requiresBaseURL).toBe(
          requiresBaseURLFor(described.name),
        );
      }
    });
  });

  describe('applying operator overrides', () => {
    const base = () =>
      connectionFromPreset('deepseek', { apiKey: 'k', model: 'deepseek-chat' });

    test('leaves the connection alone when nothing is overridden', () => {
      expect(applyOverrides(base(), {})).toEqual(base());
    });

    test('forces a capability back on for a gateway that supports it', () => {
      // Most presets declare capabilities from vendor docs rather than a live
      // call, so an operator who knows better has to be able to overrule them.
      expect(
        applyOverrides(base(), { toolSearch: true, promptCaching: true })
          .capabilities,
      ).toEqual(
        expect.objectContaining({ toolSearch: true, promptCaching: true }),
      );
    });

    test('cannot force tool search onto a dialect that lacks it', () => {
      // The OpenAI dialect drops the search tool in translation, so honouring
      // the force-on would advertise a tool that is not in the request.
      expect(
        applyOverrides(
          connectionFromPreset('openai', {
            apiKey: 'k',
            model: 'gpt-5.6-luna',
          }),
          { toolSearch: true },
        ).capabilities.toolSearch,
      ).toBe(false);
    });

    test('forces a capability off', () => {
      expect(
        applyOverrides(
          connectionFromPreset('anthropic', {
            apiKey: 'k',
            model: 'claude-sonnet-5',
          }),
          { promptCaching: false },
        ).capabilities.promptCaching,
      ).toBe(false);
    });

    test('carries timeouts, retries and reasoning effort through', () => {
      const connection = applyOverrides(base(), {
        timeoutMs: 4000,
        maxRetries: 0,
        reasoningEffort: 'medium',
      });

      expect(connection.timeoutMs).toBe(4000);
      // Zero is a real choice — "do not retry" — not an unset value.
      expect(connection.maxRetries).toBe(0);
      expect(connection.reasoningEffort).toBe('medium');
    });

    test('never touches the credential, the endpoint or the model', () => {
      // Those come from the dashboard connection and only from there.
      const connection = applyOverrides(base(), {
        toolSearch: true,
        timeoutMs: 1,
      });

      expect(connection.apiKey).toBe('k');
      expect(connection.model).toBe('deepseek-chat');
      expect(connection.baseURL).toBe('https://api.deepseek.com/anthropic');
    });
  });

  describe('per-turn controls', () => {
    test('passes the base URL and timeouts to the provider client', async () => {
      // Endpoint from the dashboard, tuning from the environment.
      connectedTo('claude-sonnet-5', {
        preset: 'custom',
        baseURL: 'https://gateway.internal',
        overrides: { timeoutMs: 90000, maxRetries: 1 },
      });
      mockCreate.mockResolvedValue({
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });

      await newService().chat([{ role: 'user', content: 'hello' }], '');

      expect(Anthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test-api-key',
          baseURL: 'https://gateway.internal',
          timeout: 90000,
          maxRetries: 1,
        }),
      );
    });

    test('omits cache breakpoints entirely when caching is off', async () => {
      connectedTo('claude-sonnet-5', {
        preset: 'custom',
        baseURL: 'https://gateway.internal',
      });
      mockCreate.mockResolvedValue({
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });

      await newService().chat(
        [{ role: 'user', content: 'hello' }],
        'some context',
      );

      const sent = mockCreate.mock.calls[0][0];
      for (const block of sent.system) {
        expect(block.cache_control).toBeUndefined();
      }
      // The tail marker exists only to carry a breakpoint, so it goes too.
      expect(typeof sent.messages[0].content).toBe('string');
      // The cautious preset has no server-side search, so the broker's own
      // finder stands in rather than all 44 definitions shipping every step.
      expect(sent.tools[0]).toMatchObject({ name: 'find_tools' });
      expect(sent.tools).toHaveLength(CORE_TOOL_NAMES.size + 1);
    });

    test('refuses a transcript already at the tool-step ceiling', async () => {
      connectedTo();
      const toolTurn = {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 't', name: 'set_method', input: {} }],
      };
      const result = await aiExperimentsService.chat(
        [
          { role: 'user', content: 'go' },
          ...Array.from({ length: 6 }, () => toolTurn),
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

    test('allows a transcript one step below the ceiling', async () => {
      connectedTo();
      mockCreate.mockResolvedValue({
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'done' }],
      });
      const toolTurn = {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 't', name: 'set_method', input: {} }],
      };

      const result = await aiExperimentsService.chat(
        [
          { role: 'user', content: 'go' },
          ...Array.from({ length: 5 }, () => toolTurn),
        ],
        '',
      );

      expect(mockCreate).toHaveBeenCalled();
      expect(result).toEqualRight(expect.objectContaining({ content: 'done' }));
    });

    test('rejects a model the instance is not configured for', async () => {
      connectedTo('claude-sonnet-5');

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'hello' }],
        '',
        'gpt-5.6',
      );

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toEqualLeft(
        expect.objectContaining({
          message: AI_EXPERIMENTS_MODEL_UNAVAILABLE,
          statusCode: 400,
        }),
      );
    });

    test('reports the serving model back to the client', async () => {
      connectedTo('claude-sonnet-5');
      mockCreate.mockResolvedValue({
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'hello' }],
        '',
        'claude-sonnet-5',
      );

      expect(result).toEqualRight(
        expect.objectContaining({ model: 'claude-sonnet-5' }),
      );
    });

    test('a gateway rejection does not degrade the same model at another endpoint', async () => {
      // `anthropic` is the only preset declaring tool search and it pins no
      // endpoint, so an admin can point one connection at the vendor and
      // another at a gateway. A gateway that refuses deferral must not latch it
      // off for the real Anthropic connection serving the same model.
      const service = newService();
      const reply = {
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      };

      connectedTo('claude-sonnet-5', {
        preset: 'anthropic',
        baseURL: 'https://gateway.internal',
      });
      mockCreate
        .mockRejectedValueOnce(
          Object.assign(new MockAPIError(400), {
            error: { error: { message: 'defer_loading is not supported' } },
          }),
        )
        .mockResolvedValue(reply);
      await service.chat([{ role: 'user', content: 'hi' }], '');
      expect(mockCreate.mock.calls[1][0].tools).toHaveLength(
        CORE_TOOL_NAMES.size + 1,
      );

      // Same preset, same model, vendor endpoint: still gets the deferred set.
      mockCreate.mockReset();
      mockCreate.mockResolvedValue(reply);
      connectedTo('claude-sonnet-5', { preset: 'anthropic' });
      await service.chat([{ role: 'user', content: 'hi' }], '');
      expect(mockCreate.mock.calls[0][0].tools.length).toBeGreaterThan(
        CHAT_TOOLS.length,
      );
    });

    test('a deferral rejection does not degrade a different connection', async () => {
      const service = newService();
      const reply = {
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      };

      // First connection: the provider rejects tool search, so it latches off.
      connectedTo('model-a');
      mockCreate
        .mockRejectedValueOnce(
          Object.assign(new MockAPIError(400), {
            error: { error: { message: 'defer_loading is not supported' } },
          }),
        )
        .mockResolvedValue(reply);
      await service.chat([{ role: 'user', content: 'hi' }], '');
      expect(mockCreate.mock.calls[1][0].tools).toHaveLength(
        CORE_TOOL_NAMES.size + 1,
      );

      // A second model on the same process must still get the deferred set.
      mockCreate.mockReset();
      mockCreate.mockResolvedValue(reply);
      connectedTo('model-b');
      await service.chat([{ role: 'user', content: 'hi' }], '');
      expect(mockCreate.mock.calls[0][0].tools.length).toBeGreaterThan(
        CHAT_TOOLS.length,
      );
    });
  });

  describe('where the connection comes from', () => {
    const reply = {
      id: 'msg_1',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'hi' }],
    };

    afterEach(() => {
      (mockProviderService.resolveForChat as jest.Mock).mockResolvedValue(
        E.left('ai_provider/not_found'),
      );
    });

    test('a registered connection wins over the environment', async () => {
      // Env still names Anthropic; the dashboard says OpenAI. The dashboard wins.
      connectedTo('claude-sonnet-5');
      (mockProviderService.resolveForChat as jest.Mock).mockResolvedValue(
        E.right({
          preset: 'anthropic',
          dialect: 'anthropic',
          auth: 'api-key',
          apiKey: 'from-dashboard',
          model: 'claude-from-dashboard',
          capabilities: {
            toolSearch: false,
            promptCaching: false,
            cacheUsageCounters: false,
          },
        }),
      );
      mockCreate.mockResolvedValue(reply);

      const result = await newService().chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(Anthropic).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'from-dashboard' }),
      );
      expect(result).toEqualRight(
        expect.objectContaining({ model: 'claude-from-dashboard' }),
      );
    });

    test('a named connection that is gone is an error, not a fallback', async () => {
      // Asking for one specific connection and silently getting another would
      // bill the wrong key and answer from the wrong model.
      connectedTo();
      (mockProviderService.resolveForChat as jest.Mock).mockResolvedValue(
        E.left('ai_provider/not_found'),
      );

      const result = await newService().chat(
        [{ role: 'user', content: 'hello' }],
        '',
        undefined,
        'conn_gone',
      );

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toEqualLeft(
        expect.objectContaining({
          message: AI_EXPERIMENTS_MODEL_UNAVAILABLE,
          statusCode: 400,
        }),
      );
    });

    test('nothing registered at all reports the chat as disabled', async () => {
      mockIsEnabled.mockResolvedValue(true);

      const result = await newService().chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(result).toEqualLeft(
        expect.objectContaining({
          message: AI_EXPERIMENTS_CHAT_DISABLED,
          statusCode: 503,
        }),
      );
    });
  });

  describe('provider presets', () => {
    test('DeepSeek brings its own endpoint and the cautious capabilities', () => {
      const connection = connectionFromPreset('deepseek', {
        apiKey: 'k',
        model: 'deepseek-chat',
      });

      expect(connection).toEqual(
        expect.objectContaining({
          preset: 'deepseek',
          auth: 'api-key',
          baseURL: 'https://api.deepseek.com/anthropic',
        }),
      );
      // Its docs describe ignoring unimplemented Anthropic fields, so sending
      // them would cost money with nothing in any log to show for it.
      expect(connection.capabilities.promptCaching).toBe(false);
      expect(connection.capabilities.toolSearch).toBe(false);
    });

    test('Bedrock authenticates with a bearer token, not the usual header', () => {
      const connection = connectionFromPreset('bedrock', {
        apiKey: 'k',
        baseURL: 'https://bedrock-runtime.us-east-1.amazonaws.com/anthropic',
        model: 'us.anthropic.claude-sonnet-4-6',
      });

      expect(connection.auth).toBe('bearer');
      // AWS documents prompt caching on that route; tool search appears nowhere.
      expect(connection.capabilities.promptCaching).toBe(true);
      expect(connection.capabilities.toolSearch).toBe(false);
    });

    test('the OpenAI presets switch reasoning off, or tools are refused', () => {
      // The API states it plainly: function tools are unsupported on
      // /v1/chat/completions unless reasoning_effort is 'none'.
      expect(
        connectionFromPreset('openai', { apiKey: 'k', model: 'gpt-5.6-luna' })
          .reasoningEffort,
      ).toBe('none');

      expect(
        connectionFromPreset(
          'openai',
          { apiKey: 'k', model: 'gpt-5.6-luna' },
          { reasoningEffort: 'medium' },
        ).reasoningEffort,
      ).toBe('medium');
    });

    test('an explicit base URL still beats a preset default', () => {
      expect(
        connectionFromPreset('deepseek', {
          apiKey: 'k',
          baseURL: 'https://gateway.internal/deepseek',
          model: 'deepseek-chat',
        }).baseURL,
      ).toBe('https://gateway.internal/deepseek');
    });

    test('the auth style can be overridden for a gateway that differs', () => {
      expect(
        connectionFromPreset(
          'deepseek',
          { apiKey: 'k', model: 'deepseek-chat' },
          { auth: 'bearer' },
        ).auth,
      ).toBe('bearer');
    });

    test('a bearer connection sends the token as a bearer, not an api key', async () => {
      connectedTo('us.anthropic.claude-sonnet-4-6', {
        preset: 'bedrock',
        baseURL: 'https://bedrock-runtime.us-east-1.amazonaws.com/anthropic',
      });
      mockResolveForChat.mockResolvedValue(
        E.right(
          connectionFromPreset('bedrock', {
            apiKey: 'bedrock-token',
            baseURL:
              'https://bedrock-runtime.us-east-1.amazonaws.com/anthropic',
            model: 'us.anthropic.claude-sonnet-4-6',
          }),
        ),
      );
      mockCreate.mockResolvedValue({
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hi' }],
      });

      await newService().chat([{ role: 'user', content: 'hello' }], '');

      expect(Anthropic).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: null, authToken: 'bedrock-token' }),
      );
    });

    test('refuses to run Bedrock without the region endpoint it needs', async () => {
      // The dashboard blocks this at save time; the guard stays because a row
      // written before that rule existed would otherwise reach the vendor.
      connectedTo('us.anthropic.claude-sonnet-4-6', { preset: 'bedrock' });

      const result = await newService().chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toEqualLeft(expect.objectContaining({ statusCode: 503 }));
    });
  });

  describe('model validation', () => {
    test('rejects a bare Bedrock model id, which needs a region profile', () => {
      expect(
        validateModelForPreset('bedrock', 'anthropic.claude-sonnet-4-6'),
      ).toEqual(expect.objectContaining({ level: 'error' }));
      expect(
        validateModelForPreset('bedrock', 'us.anthropic.claude-sonnet-4-6'),
      ).toEqual({ level: 'ok' });
      expect(
        validateModelForPreset(
          'bedrock',
          'arn:aws:bedrock:us-east-1:1:inference-profile/x',
        ),
      ).toEqual({ level: 'ok' });
    });

    test("rejects another vendor's model on DeepSeek, which would answer anyway", () => {
      // The danger is not an error, it is a normal-looking reply from the
      // wrong model, because DeepSeek falls back to its own default.
      expect(validateModelForPreset('deepseek', 'claude-sonnet-5')).toEqual(
        expect.objectContaining({ level: 'error' }),
      );
      expect(validateModelForPreset('deepseek', 'deepseek-chat')).toEqual({
        level: 'ok',
      });
    });

    test('only warns about an unfamiliar DeepSeek id, which may simply be new', () => {
      expect(validateModelForPreset('deepseek', 'reasoner-next')).toEqual(
        expect.objectContaining({ level: 'warn' }),
      );
    });

    test('leaves other presets alone but still requires a model', () => {
      expect(validateModelForPreset('anthropic', 'claude-sonnet-5')).toEqual({
        level: 'ok',
      });
      expect(validateModelForPreset('custom', 'whatever-1')).toEqual({
        level: 'ok',
      });
      expect(validateModelForPreset('anthropic', '  ')).toEqual(
        expect.objectContaining({ level: 'error' }),
      );
    });
  });

  describe('the local tool finder', () => {
    test('ranks a name match far above a description match', () => {
      const names = findToolsByQuery('create a collection', new Set()).map(
        (t) => t.name,
      );
      expect(names.length).toBeGreaterThan(0);
      expect(names[0]).toContain('collection');
    });

    test('never offers a tool that is already loaded', () => {
      const first = findToolsByQuery('collection', new Set())[0];
      const again = findToolsByQuery('collection', new Set([first.name]));
      expect(again.some((t) => t.name === first.name)).toBe(false);
    });

    test('returns nothing for a query with no real words', () => {
      expect(findToolsByQuery('the a of to', new Set())).toEqual([]);
      expect(findToolsByQuery('', new Set())).toEqual([]);
    });

    test('reads the already-used tools out of the transcript', () => {
      expect(
        collectUsedToolNames([
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            content: [
              { type: 'tool_use', id: '1', name: 'create_collection' },
              { type: 'tool_use', id: '2', name: 'set_method' },
            ],
          },
          {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: '1', content: 'ok' }],
          },
        ]),
      ).toEqual(new Set(['create_collection', 'set_method']));
    });

    test('offers the finder plus the core set, and keeps what was used', () => {
      const bare = buildSearchableChatTools(new Set());
      expect(bare[0].name).toBe('find_tools');
      expect(bare).toHaveLength(CORE_TOOL_NAMES.size + 1);

      const withUsed = buildSearchableChatTools(new Set(['create_collection']));
      expect(withUsed).toHaveLength(CORE_TOOL_NAMES.size + 2);
      expect(withUsed.some((t) => t.name === 'create_collection')).toBe(true);
    });
  });

  describe('brokered tool search', () => {
    // The cautious preset declares no native tool search, which is exactly
    // when the broker answers the search itself.
    const configureLocalSearch = () => {
      connectedTo('claude-sonnet-5', {
        preset: 'custom',
        baseURL: 'https://gateway.internal',
      });
    };

    const searchTurn = (query: string) => ({
      id: 'msg_search',
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'find_1',
          name: 'find_tools',
          input: { query },
        },
      ],
    });

    test('answers the search itself and asks again with the tools loaded', async () => {
      configureLocalSearch();
      mockCreate
        .mockResolvedValueOnce(searchTurn('create a collection'))
        .mockResolvedValueOnce({
          id: 'msg_done',
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'call_1',
              name: 'create_collection',
              input: { name: 'shop' },
            },
          ],
        });

      const result = await newService().chat(
        [{ role: 'user', content: 'create a collection called shop' }],
        '',
      );

      expect(mockCreate).toHaveBeenCalledTimes(2);
      // The second ask carries the tools the search turned up.
      const secondTools = mockCreate.mock.calls[1][0].tools.map(
        (t: { name: string }) => t.name,
      );
      expect(secondTools).toContain('create_collection');

      // The client never learns the finder exists; it only sees real work.
      expect(result).toEqualRight(
        expect.objectContaining({
          tool_calls: [
            {
              id: 'call_1',
              name: 'create_collection',
              input: { name: 'shop' },
            },
          ],
        }),
      );
    });

    test('reports what it loaded so the user sees the extra step', async () => {
      configureLocalSearch();
      mockCreate
        .mockResolvedValueOnce(searchTurn('publish documentation'))
        .mockResolvedValueOnce({
          id: 'msg_done',
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'done' }],
        });

      const result = await newService().chat(
        [{ role: 'user', content: 'publish the docs' }],
        '',
      );

      expect(result).toEqualRight(
        expect.objectContaining({
          loaded_tools: expect.arrayContaining([
            expect.stringContaining('documentation'),
          ]),
        }),
      );
    });

    test('stops searching after the round cap and never leaks the finder', async () => {
      configureLocalSearch();
      // A model that only ever searches must still terminate.
      mockCreate.mockResolvedValue(searchTurn('collection'));

      const result = await newService().chat(
        [{ role: 'user', content: 'do something' }],
        '',
      );

      // The initial ask plus two answered rounds, then it gives up.
      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(result).toEqualRight(expect.objectContaining({ tool_calls: [] }));
    });

    test('drops the unanswered search from the content it hands back', async () => {
      configureLocalSearch();
      mockCreate.mockResolvedValue(searchTurn('collection'));

      const result = await newService().chat(
        [{ role: 'user', content: 'do something' }],
        '',
      );

      // The client echoes assistant_content back verbatim on the next step. A
      // tool_use no tool_result can ever answer makes the provider reject the
      // whole turn, so stripping it from tool_calls alone is not enough.
      const content = E.isRight(result)
        ? ((result.right as Record<string, unknown>).assistant_content as
            unknown[] | undefined)
        : undefined;
      expect(
        (content ?? []).some(
          (block) => (block as { name?: unknown })?.name === 'find_tools',
        ),
      ).toBe(false);
    });

    test('tells the model plainly when a search matched nothing', async () => {
      configureLocalSearch();
      mockCreate
        .mockResolvedValueOnce(searchTurn('xyzzy nonsense'))
        .mockResolvedValueOnce({
          id: 'msg_done',
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'not supported' }],
        });

      await newService().chat(
        [{ role: 'user', content: 'do the impossible' }],
        '',
      );

      const replayed = mockCreate.mock.calls[1][0].messages;
      const answer = replayed[replayed.length - 1].content[0].content;
      expect(answer).toContain('No tools matched');
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
