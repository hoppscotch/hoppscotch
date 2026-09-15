import Anthropic from '@anthropic-ai/sdk';
import {
  authHeaders,
  fromOpenAICompletion,
  joinURL,
  toOpenAIMessages,
  toOpenAITools,
} from './ai-experiments.openai';
import { CHAT_TOOLS, buildChatTools } from './ai-experiments.tools';

describe('OpenAI dialect translation', () => {
  describe('toOpenAITools', () => {
    test('renames the wrapper and leaves the schema alone', () => {
      const [tool] = toOpenAITools([
        {
          name: 'set_method',
          description: 'Sets the HTTP method',
          input_schema: {
            type: 'object',
            properties: { method: { type: 'string', enum: ['GET', 'POST'] } },
            required: ['method'],
          },
        } as Anthropic.Tool,
      ]);

      expect(tool).toEqual({
        type: 'function',
        function: {
          name: 'set_method',
          description: 'Sets the HTTP method',
          parameters: {
            type: 'object',
            properties: { method: { type: 'string', enum: ['GET', 'POST'] } },
            required: ['method'],
          },
        },
      });
    });

    test('drops the server-side search tool, which has no equivalent here', () => {
      const deferred = buildChatTools(true);
      const translated = toOpenAITools(deferred);

      // The deferred set carries the search tool plus every real tool.
      expect(deferred.length).toBe(CHAT_TOOLS.length + 1);
      expect(translated).toHaveLength(CHAT_TOOLS.length);
      expect(
        translated.some((t) => t.function.name === 'tool_search_tool_regex'),
      ).toBe(false);
    });

    test('carries the whole tool contract across', () => {
      expect(toOpenAITools(buildChatTools(false))).toHaveLength(
        CHAT_TOOLS.length,
      );
    });
  });

  describe('toOpenAIMessages', () => {
    test('folds the system blocks into one leading message', () => {
      const out = toOpenAIMessages(
        [
          { text: 'You are an assistant.', cacheable: true },
          { text: '## Current context\nGET /users', cacheable: true },
        ],
        [{ role: 'user', content: 'hello' }],
      );

      expect(out).toEqual([
        {
          role: 'system',
          content: 'You are an assistant.\n\n## Current context\nGET /users',
        },
        { role: 'user', content: 'hello' },
      ]);
    });

    test('moves a tool result out into its own message', () => {
      const out = toOpenAIMessages(
        [],
        [
          { role: 'user', content: 'set it to POST' },
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Setting the method. ' },
              {
                type: 'tool_use',
                id: 'toolu_1',
                name: 'set_method',
                input: { method: 'POST' },
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_1',
                content: '✓ Set the method to POST.',
              },
            ],
          },
        ],
      );

      expect(out).toEqual([
        { role: 'user', content: 'set it to POST' },
        {
          role: 'assistant',
          content: 'Setting the method. ',
          tool_calls: [
            {
              id: 'toolu_1',
              type: 'function',
              function: {
                name: 'set_method',
                arguments: '{"method":"POST"}',
              },
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: 'toolu_1',
          content: '✓ Set the method to POST.',
        },
      ]);
    });

    test('keeps each result adjacent to the call it answers', () => {
      const out = toOpenAIMessages(
        [],
        [
          {
            role: 'assistant',
            content: [
              { type: 'tool_use', id: 'a', name: 'set_method', input: {} },
              { type: 'tool_use', id: 'b', name: 'set_url', input: {} },
            ],
          },
          {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'a', content: 'done a' },
              { type: 'tool_result', tool_use_id: 'b', content: 'done b' },
            ],
          },
        ],
      );

      expect(out.map((m) => m.role)).toEqual(['assistant', 'tool', 'tool']);
      expect(out[1]).toMatchObject({ tool_call_id: 'a' });
      expect(out[2]).toMatchObject({ tool_call_id: 'b' });
    });

    test('states a failure in the text, since the shape has no flag for it', () => {
      const out = toOpenAIMessages(
        [],
        [
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'a',
                content: '⚠️ run_request failed',
                is_error: true,
              },
            ],
          },
        ],
      );

      expect(out[0]).toMatchObject({
        role: 'tool',
        content: '[error] ⚠️ run_request failed',
      });
    });

    test('drops empty turns rather than sending them', () => {
      expect(
        toOpenAIMessages(
          [],
          [
            { role: 'user', content: '   ' },
            { role: 'assistant', content: [] },
            { role: 'user', content: null },
          ],
        ),
      ).toEqual([]);
    });
  });

  describe('fromOpenAICompletion', () => {
    test('reads text, calls and usage from a tool-calling reply', () => {
      const turn = fromOpenAICompletion({
        id: 'chatcmpl-1',
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              content: 'Setting the method.',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'set_method',
                    arguments: '{"method":"POST"}',
                  },
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 40,
          prompt_tokens_details: { cached_tokens: 1000 },
        },
      });

      expect(turn.traceId).toBe('chatcmpl-1');
      expect(turn.content).toBe('Setting the method.');
      expect(turn.toolCalls).toEqual([
        { id: 'call_1', name: 'set_method', input: { method: 'POST' } },
      ]);
      expect(turn.stopReason).toBe('end');
      expect(turn.usage.input_tokens).toBe(1200);
      expect(turn.usage.output_tokens).toBe(40);
      expect(turn.usage.cache_read_input_tokens).toBe(1000);
      // Not reported in this reply, and absent must not become zero.
      expect(turn.usage.cache_creation_input_tokens).toBeUndefined();
    });

    test('tells the user when the model emitted unreadable arguments', () => {
      const turn = fromOpenAICompletion({
        id: 'chatcmpl-2',
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              content: '',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'set_body', arguments: '{"body": ' },
                },
              ],
            },
          },
        ],
      });

      expect(turn.toolCalls[0].input).toEqual({});
      expect(turn.content).toContain('set_body');
      expect(turn.content).toContain("couldn't read");
    });

    test('maps the truncated and refused endings', () => {
      expect(
        fromOpenAICompletion({
          choices: [{ finish_reason: 'length', message: { content: 'half' } }],
        }).stopReason,
      ).toBe('max_tokens');

      const refused = fromOpenAICompletion({
        choices: [
          { finish_reason: 'stop', message: { refusal: 'I cannot help.' } },
        ],
      });
      expect(refused.stopReason).toBe('refusal');
      expect(refused.content).toBe('I cannot help.');
    });

    test('reads both cache counters when the provider reports them', () => {
      // Verified against a live gpt-5.6-luna reply: prompt_tokens_details
      // carries cached_tokens and cache_write_tokens.
      const turn = fromOpenAICompletion({
        id: 'chatcmpl-4',
        choices: [{ finish_reason: 'stop', message: { content: 'hi' } }],
        usage: {
          prompt_tokens: 139,
          completion_tokens: 17,
          prompt_tokens_details: { cached_tokens: 100, cache_write_tokens: 39 },
        },
      });
      expect(turn.usage.cache_read_input_tokens).toBe(100);
      expect(turn.usage.cache_creation_input_tokens).toBe(39);
    });

    test('survives a reply with no choices at all', () => {
      const turn = fromOpenAICompletion({ id: 'chatcmpl-3' });
      expect(turn.content).toBe('');
      expect(turn.toolCalls).toEqual([]);
      expect(turn.stopReason).toBe('end');
    });
  });

  describe('endpoint plumbing', () => {
    test('joins a base URL however the operator wrote it', () => {
      expect(joinURL('https://api.openai.com/v1', 'chat/completions')).toBe(
        'https://api.openai.com/v1/chat/completions',
      );
      expect(joinURL('https://api.openai.com/v1/', '/chat/completions')).toBe(
        'https://api.openai.com/v1/chat/completions',
      );
    });

    test('sends the credential the way each endpoint expects it', () => {
      expect(authHeaders('api-key', 'k')).toEqual({
        Authorization: 'Bearer k',
      });
      expect(authHeaders('bearer', 'k')).toEqual({
        Authorization: 'Bearer k',
      });
      // Azure takes its own header, which is what gateways in front of it want.
      expect(authHeaders('azure-api-key', 'k')).toEqual({ 'api-key': 'k' });
    });
  });
});
