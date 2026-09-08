import { mockDeep, mockReset } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as E from 'fp-ts/Either';
import {
  AI_EXPERIMENTS_CANNOT_RUN_CHAT,
  AI_EXPERIMENTS_CHAT_INPUT_TOO_LARGE,
  AI_EXPERIMENTS_INVALID_CHAT_INPUT,
} from 'src/errors';
import {
  AIExperimentsService,
  sanitizeChatContent,
} from './ai-experiments.service';
import { CHAT_TOOLS } from './ai-experiments.tools';

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
      mockConfigService.get.mockReturnValue(undefined);

      const result = await aiExperimentsService.chat(
        [{ role: 'user', content: 'hello' }],
        '',
      );

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result).toEqualLeft(
        expect.objectContaining({ message: AI_EXPERIMENTS_CANNOT_RUN_CHAT }),
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
        expect.objectContaining({ message: AI_EXPERIMENTS_CANNOT_RUN_CHAT }),
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

      expect(result).toEqualRight({
        content: 'Setting the method.',
        tool_calls: [
          { id: 'toolu_1', name: 'set_method', input: { method: 'POST' } },
        ],
        trace_id: 'msg_123',
      });
    });

    describe('AI chat tool contract', () => {
      test('exposes collection building and verification tools', () => {
        expect(CHAT_TOOLS.map((tool) => tool.name)).toEqual(
          expect.arrayContaining([
            'add_or_update_collection_requests',
            'run_collection',
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
          tools: CHAT_TOOLS,
          system: expect.stringContaining('## Current context\nCTX'),
          messages: [
            { role: 'user', content: 'sneaky role' },
            { role: 'assistant', content: 'earlier reply' },
            { role: 'user', content: 'question' },
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
        [{ role: 'user', content: 'Use token sk-secret' }],
        'Authorization: Bearer request-secret',
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Authorization: [REDACTED]'),
          messages: [{ role: 'user', content: 'Use token [REDACTED]' }],
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

    test('should resolve left when the model refuses', async () => {
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

      expect(result).toEqualLeft(
        expect.objectContaining({ message: AI_EXPERIMENTS_CANNOT_RUN_CHAT }),
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

  describe('sanitizeChatContent', () => {
    test('redacts common credential fields and bearer tokens', () => {
      expect(
        sanitizeChatContent(
          'Authorization: Bearer request-secret\nx-api-key=key-secret\nbody={"password":"hunter2"}',
        ),
      ).toBe(
        'Authorization: [REDACTED]\nx-api-key=[REDACTED]\nbody={"password":"[REDACTED]"}',
      );
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
