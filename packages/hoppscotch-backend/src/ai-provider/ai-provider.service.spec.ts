import { mockDeep, mockReset } from 'jest-mock-extended';
import * as E from 'fp-ts/Either';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AI_PROVIDER_BASE_URL_REQUIRED,
  AI_PROVIDER_INVALID_PRESET,
  AI_PROVIDER_KEY_REQUIRED,
  AI_PROVIDER_KEY_UNREADABLE,
  AI_PROVIDER_LABEL_SHORT,
  AI_PROVIDER_LABEL_TAKEN,
  AI_PROVIDER_MODELS_INVALID,
  AI_PROVIDER_MODEL_REJECTED,
  AI_PROVIDER_NOT_FOUND,
} from 'src/errors';

// encrypt/decrypt read this at call time; without it every write throws.
process.env.DATA_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';

jest.mock('./ai-provider.tester', () => ({ testChatConnection: jest.fn() }));

import { AIProviderService } from './ai-provider.service';
import { testChatConnection } from './ai-provider.tester';
import { decrypt, encrypt } from 'src/utils';

const mockPrisma = mockDeep<PrismaService>();
const service = new AIProviderService(mockPrisma);

const row = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    id: 'conn_1',
    label: 'OpenAI',
    preset: 'openai',
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'encrypted',
    models: ['gpt-5.6-luna', 'gpt-5.6-terra'],
    defaultModel: 'gpt-5.6-luna',
    enabled: true,
    isDefault: true,
    orderIndex: 0,
    createdOn: new Date(),
    updatedOn: new Date(),
    ...over,
  }) as never;

const validInput = {
  label: 'OpenAI',
  preset: 'openai',
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'sk-secret-value',
  models: ['gpt-5.6-luna'],
  defaultModel: 'gpt-5.6-luna',
};

const mockedTest = testChatConnection as jest.MockedFunction<
  typeof testChatConnection
>;

beforeEach(() => {
  mockReset(mockPrisma);
  mockedTest.mockReset();
  mockedTest.mockImplementation((connection) =>
    Promise.resolve({ model: connection.model, ok: true, latencyMs: 1 }),
  );
});

describe('AIProviderService', () => {
  describe('what a client is allowed to see', () => {
    test('never returns the key, only whether one is stored', async () => {
      mockPrisma.aiProviderConnection.findMany.mockResolvedValue([row()]);

      const [connection] = await service.getAll();

      expect(connection).not.toHaveProperty('apiKey');
      expect(connection.hasApiKey).toBe(true);
      expect(JSON.stringify(connection)).not.toContain('encrypted');
    });

    test('offers the chat only labels and models', async () => {
      mockPrisma.aiProviderConnection.findMany.mockResolvedValue([row()]);

      const options = await service.listModelOptions();

      expect(options).toEqual([
        {
          connectionID: 'conn_1',
          connectionLabel: 'OpenAI',
          preset: 'openai',
          model: 'gpt-5.6-luna',
          isDefault: true,
        },
        {
          connectionID: 'conn_1',
          connectionLabel: 'OpenAI',
          preset: 'openai',
          model: 'gpt-5.6-terra',
          isDefault: false,
        },
      ]);
      // Disabled connections are never offered.
      expect(
        mockPrisma.aiProviderConnection.findMany.mock.calls[0][0],
      ).toMatchObject({ where: { enabled: true } });
    });
  });

  describe('create', () => {
    test('stores the key encrypted, never in the clear', async () => {
      mockPrisma.aiProviderConnection.count.mockResolvedValue(0);
      mockPrisma.aiProviderConnection.create.mockResolvedValue(row());

      await service.create(validInput);

      const written = mockPrisma.aiProviderConnection.create.mock.calls[0][0]
        .data as { apiKey: string };
      expect(written.apiKey).not.toBe('sk-secret-value');
      expect(decrypt(written.apiKey)).toBe('sk-secret-value');
    });

    test('makes the first connection the default, or nothing would be', async () => {
      mockPrisma.aiProviderConnection.count.mockResolvedValue(0);
      mockPrisma.aiProviderConnection.create.mockResolvedValue(row());

      await service.create(validInput);

      expect(
        (mockPrisma.aiProviderConnection.create.mock.calls[0][0].data as never)[
          'isDefault'
        ],
      ).toBe(true);
    });

    test('refuses a connection with no key', async () => {
      expect(await service.create({ ...validInput, apiKey: '  ' })).toEqualLeft(
        AI_PROVIDER_KEY_REQUIRED,
      );
      expect(mockPrisma.aiProviderConnection.create).not.toHaveBeenCalled();
    });

    test('refuses a preset this build does not know', async () => {
      expect(
        await service.create({ ...validInput, preset: 'sometimes-ai' }),
      ).toEqualLeft(AI_PROVIDER_INVALID_PRESET);
    });

    test('refuses a label too short to recognise in the picker', async () => {
      expect(await service.create({ ...validInput, label: 'x' })).toEqualLeft(
        AI_PROVIDER_LABEL_SHORT,
      );
    });

    test('refuses a default model the connection does not offer', async () => {
      expect(
        await service.create({ ...validInput, defaultModel: 'gpt-9' }),
      ).toEqualLeft(AI_PROVIDER_MODELS_INVALID);
    });

    test('refuses a preset whose endpoint carries a region, with none given', async () => {
      expect(
        await service.create({
          ...validInput,
          preset: 'bedrock',
          baseURL: undefined,
          models: ['us.anthropic.claude-sonnet-4-6'],
          defaultModel: 'us.anthropic.claude-sonnet-4-6',
        }),
      ).toEqualLeft(AI_PROVIDER_BASE_URL_REQUIRED);
    });

    test('refuses a model the preset would silently mis-serve', async () => {
      // DeepSeek answers an unknown id with its own default rather than failing.
      expect(
        await service.create({
          ...validInput,
          preset: 'deepseek',
          baseURL: undefined,
          models: ['claude-sonnet-5'],
          defaultModel: 'claude-sonnet-5',
        }),
      ).toEqualLeft(AI_PROVIDER_MODEL_REJECTED);
    });
  });

  describe('update', () => {
    test('keeps the stored key when none is supplied', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.update.mockResolvedValue(row());

      await service.update({ id: 'conn_1', label: 'OpenAI prod' });

      const data = mockPrisma.aiProviderConnection.update.mock.calls[0][0]
        .data as Record<string, unknown>;
      // It cannot be read back, so an edit must not have to resend it.
      expect(data).not.toHaveProperty('apiKey');
      expect(data.label).toBe('OpenAI prod');
    });

    test('rotates the key when one is supplied', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.update.mockResolvedValue(row());

      await service.update({ id: 'conn_1', apiKey: 'sk-rotated' });

      const data = mockPrisma.aiProviderConnection.update.mock.calls[0][0]
        .data as { apiKey: string };
      expect(decrypt(data.apiKey)).toBe('sk-rotated');
    });

    test('refuses to edit a connection that is gone', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(null);
      expect(await service.update({ id: 'missing' })).toEqualLeft(
        AI_PROVIDER_NOT_FOUND,
      );
    });
  });

  describe('resolveForChat', () => {
    test('decrypts the key and applies the preset', async () => {
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(
        row({ apiKey: encrypt('sk-live') }),
      );

      const res = await service.resolveForChat();

      expect(E.isRight(res)).toBe(true);
      if (E.isRight(res)) {
        expect(res.right.apiKey).toBe('sk-live');
        expect(res.right.dialect).toBe('openai');
        expect(res.right.model).toBe('gpt-5.6-luna');
        // The preset decides this, and it is why tools work at all on OpenAI.
        expect(res.right.reasoningEffort).toBe('none');
      }
    });

    test('refuses a model the connection does not offer', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());

      expect(await service.resolveForChat('conn_1', 'gpt-9')).toEqualLeft(
        AI_PROVIDER_MODEL_REJECTED,
      );
    });

    test('refuses a disabled connection rather than falling back', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ enabled: false }),
      );

      expect(await service.resolveForChat('conn_1')).toEqualLeft(
        AI_PROVIDER_NOT_FOUND,
      );
    });

    test('says so plainly when nothing is configured', async () => {
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(null);
      expect(await service.resolveForChat()).toEqualLeft(AI_PROVIDER_NOT_FOUND);
    });
  });

  describe('testConnection', () => {
    test('probes every model the connection offers', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ apiKey: encrypt('sk-stored') }),
      );

      const res = await service.testConnection({ id: 'conn_1' });

      expect(res).toBeRight();
      expect(mockedTest).toHaveBeenCalledTimes(2);
      expect(mockedTest.mock.calls.map((c) => c[0].model)).toEqual([
        'gpt-5.6-luna',
        'gpt-5.6-terra',
      ]);
    });

    test('uses the stored key, since an edit cannot retype what it cannot read', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ apiKey: encrypt('sk-stored') }),
      );

      await service.testConnection({ id: 'conn_1' });

      expect(mockedTest.mock.calls[0][0].apiKey).toBe('sk-stored');
    });

    test('prefers a key typed into the form over the stored one', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ apiKey: encrypt('sk-stored') }),
      );

      await service.testConnection({ id: 'conn_1', apiKey: 'sk-typed' });

      expect(mockedTest.mock.calls[0][0].apiKey).toBe('sk-typed');
    });

    test('tests what the form says, not what was last saved', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ apiKey: encrypt('sk-stored') }),
      );

      await service.testConnection({ id: 'conn_1', models: ['gpt-5.6-terra'] });

      expect(mockedTest).toHaveBeenCalledTimes(1);
      expect(mockedTest.mock.calls[0][0].model).toBe('gpt-5.6-terra');
    });

    test('tests a draft that was never saved', async () => {
      const res = await service.testConnection({
        preset: 'openai',
        apiKey: 'sk-draft',
        models: ['gpt-5.6-luna'],
      });

      expect(res).toBeRight();
      expect(mockPrisma.aiProviderConnection.findUnique).not.toHaveBeenCalled();
      expect(mockedTest.mock.calls[0][0].apiKey).toBe('sk-draft');
    });

    test('applies the preset, so the probe goes out as the chat would', async () => {
      await service.testConnection({
        preset: 'openai',
        apiKey: 'sk-draft',
        models: ['gpt-5.6-luna'],
      });

      const connection = mockedTest.mock.calls[0][0];
      expect(connection.dialect).toBe('openai');
      expect(connection.reasoningEffort).toBe('none');
    });

    test('refuses a draft with no key', async () => {
      expect(
        await service.testConnection({
          preset: 'openai',
          models: ['gpt-5.6-luna'],
        }),
      ).toEqualLeft(AI_PROVIDER_KEY_REQUIRED);
      expect(mockedTest).not.toHaveBeenCalled();
    });

    test('refuses a preset whose endpoint carries a region, with none given', async () => {
      expect(
        await service.testConnection({
          preset: 'bedrock',
          apiKey: 'k',
          models: ['us.anthropic.claude-sonnet-4-6'],
        }),
      ).toEqualLeft(AI_PROVIDER_BASE_URL_REQUIRED);
    });

    test('refuses a preset this build does not know', async () => {
      expect(
        await service.testConnection({
          preset: 'sometimes-ai',
          apiKey: 'k',
          models: ['m'],
        }),
      ).toEqualLeft(AI_PROVIDER_INVALID_PRESET);
    });

    test('refuses to test a connection that is gone', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(null);

      expect(await service.testConnection({ id: 'missing' })).toEqualLeft(
        AI_PROVIDER_NOT_FOUND,
      );
    });

    test('refuses a test with nothing to test', async () => {
      expect(
        await service.testConnection({ preset: 'openai', apiKey: 'k' }),
      ).toEqualLeft(AI_PROVIDER_MODELS_INVALID);
    });

    test('caps the probes, because each one is a real billable call', async () => {
      const many = Array.from({ length: 25 }, (_, i) => `model-${i}`);

      await service.testConnection({
        preset: 'openai',
        apiKey: 'k',
        models: many,
      });

      expect(mockedTest).toHaveBeenCalledTimes(service.MAX_TEST_MODELS);
    });

    test('reports a failing model without hiding the working ones', async () => {
      mockedTest.mockImplementation((connection) =>
        Promise.resolve(
          connection.model === 'gpt-5.6-terra'
            ? {
                model: connection.model,
                ok: false,
                latencyMs: 4,
                reason: 'not_found' as const,
                detail: 'no such model',
              }
            : { model: connection.model, ok: true, latencyMs: 2 },
        ),
      );
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ apiKey: encrypt('sk-stored') }),
      );

      const res = await service.testConnection({ id: 'conn_1' });

      expect(res).toBeRight();
      if (E.isRight(res)) {
        expect(res.right).toEqual([
          {
            model: 'gpt-5.6-luna',
            ok: true,
            latencyMs: 2,
            reason: null,
            detail: null,
          },
          {
            model: 'gpt-5.6-terra',
            ok: false,
            latencyMs: 4,
            reason: 'not_found',
            detail: 'no such model',
          },
        ]);
      }
    });

    test('says so plainly when the stored key cannot be decrypted', async () => {
      // DATA_ENCRYPTION_KEY changed under the row; re-entering it is the fix.
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ apiKey: 'not-actually-ciphertext' }),
      );

      expect(await service.testConnection({ id: 'conn_1' })).toEqualLeft(
        AI_PROVIDER_KEY_UNREADABLE,
      );
      expect(mockedTest).not.toHaveBeenCalled();
    });
  });

  describe('keeping exactly one default', () => {
    test('disabling the default hands it to the next enabled connection', async () => {
      // Otherwise the picker has no default to mark and the chat quietly
      // serves whichever connection happens to sort first.
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.update.mockResolvedValue(
        row({ enabled: false, isDefault: true }),
      );
      mockPrisma.aiProviderConnection.findFirst
        // The label clash check asks first; no other row claims this label.
        .mockResolvedValueOnce(null)
        .mockResolvedValue(row({ id: 'conn_2', isDefault: false }));

      const res = await service.update({ id: 'conn_1', enabled: false });

      expect(res).toBeRight();
      const writes = mockPrisma.aiProviderConnection.update.mock.calls;
      // It is demoted...
      expect(writes[1][0]).toMatchObject({
        where: { id: 'conn_1' },
        data: { isDefault: false },
      });
      // ...and the next enabled one takes over.
      expect(writes[2][0]).toMatchObject({
        where: { id: 'conn_2' },
        data: { isDefault: true },
      });
    });

    test('reports the connection as no longer default', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.update
        .mockResolvedValueOnce(row({ enabled: false, isDefault: true }))
        .mockResolvedValueOnce(row({ enabled: false, isDefault: false }));
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(null);

      const res = await service.update({ id: 'conn_1', enabled: false });

      expect(res).toBeRight();
      if (E.isRight(res)) expect(res.right.isDefault).toBe(false);
    });

    test('leaves the default alone when a non-default is disabled', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ isDefault: false }),
      );
      mockPrisma.aiProviderConnection.update.mockResolvedValue(
        row({ enabled: false, isDefault: false }),
      );
      mockPrisma.aiProviderConnection.findFirst
        .mockResolvedValueOnce(null)
        // Some other connection already holds the default.
        .mockResolvedValue(row({ id: 'conn_2', isDefault: true }));

      await service.update({ id: 'conn_1', enabled: false });

      // Only the edit itself is written; nothing is promoted or demoted.
      expect(mockPrisma.aiProviderConnection.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.aiProviderConnection.updateMany).not.toHaveBeenCalled();
    });

    test('makes the first connection default even when the form says otherwise', async () => {
      // The add form always sends the toggle's value, so a first connection
      // arrives with isDefault false and would leave the instance with none.
      mockPrisma.aiProviderConnection.count.mockResolvedValue(0);
      mockPrisma.aiProviderConnection.create.mockResolvedValue(
        row({ isDefault: false }),
      );
      mockPrisma.aiProviderConnection.findFirst
        // First the label clash check, then "is there a default?" — neither.
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(row({ isDefault: false }));
      mockPrisma.aiProviderConnection.update.mockResolvedValue(
        row({ isDefault: true }),
      );
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ isDefault: true }),
      );

      const res = await service.create({ ...validInput, isDefault: false });

      expect(res).toBeRight();
      expect(mockPrisma.aiProviderConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn_1' },
        data: { isDefault: true },
      });
      if (E.isRight(res)) expect(res.right.isDefault).toBe(true);
    });

    test('does not promote anything when a default already exists', async () => {
      mockPrisma.aiProviderConnection.count.mockResolvedValue(1);
      mockPrisma.aiProviderConnection.create.mockResolvedValue(
        row({ id: 'conn_2', isDefault: false }),
      );
      mockPrisma.aiProviderConnection.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue(row());
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(
        row({ id: 'conn_2', isDefault: false }),
      );

      await service.create({ ...validInput, isDefault: false });

      expect(mockPrisma.aiProviderConnection.update).not.toHaveBeenCalled();
    });

    test('deleting the default still hands it on', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(
        row({ id: 'conn_2', isDefault: false }),
      );

      await service.delete('conn_1');

      expect(mockPrisma.aiProviderConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn_2' },
        data: { isDefault: true },
      });
    });

    test('does not rewrite a default that is already correct', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(
        row({ id: 'conn_2', isDefault: true }),
      );

      await service.delete('conn_1');

      expect(mockPrisma.aiProviderConnection.update).not.toHaveBeenCalled();
    });
  });

  describe('telling two connections apart', () => {
    test('refuses a label another connection already answers to', async () => {
      // The label is the only thing that differs on screen; two cards sharing
      // one are indistinguishable when editing, deleting or testing.
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(row());

      expect(await service.create(validInput)).toEqualLeft(
        AI_PROVIDER_LABEL_TAKEN,
      );
      expect(mockPrisma.aiProviderConnection.create).not.toHaveBeenCalled();
    });

    test('ignores case and surrounding space when comparing', async () => {
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(row());

      await service.create({ ...validInput, label: '  OpenAI  ' });

      expect(
        mockPrisma.aiProviderConnection.findFirst.mock.calls[0][0],
      ).toMatchObject({
        where: { label: { equals: 'OpenAI', mode: 'insensitive' } },
      });
    });

    test('lets a connection keep its own label when edited', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(null);
      mockPrisma.aiProviderConnection.update.mockResolvedValue(row());

      const res = await service.update({
        id: 'conn_1',
        baseURL: 'https://x/v1',
      });

      expect(res).toBeRight();
      // The row being edited is excluded from the clash check.
      expect(
        mockPrisma.aiProviderConnection.findFirst.mock.calls[0][0],
      ).toMatchObject({ where: { id: { not: 'conn_1' } } });
    });

    test('refuses an edit that renames onto another connection', async () => {
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(
        row({ id: 'conn_2' }),
      );

      expect(
        await service.update({ id: 'conn_1', label: 'Anthropic' }),
      ).toEqualLeft(AI_PROVIDER_LABEL_TAKEN);
      expect(mockPrisma.aiProviderConnection.update).not.toHaveBeenCalled();
    });

    test('stores an edited label trimmed, so the clash check can see it', async () => {
      // labelIsTaken trims the incoming value and compares it against the raw
      // column, so a stored "Anthropic " would never match an incoming
      // "Anthropic" and both rows would land.
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue(row({ isDefault: true }));
      mockPrisma.aiProviderConnection.update.mockResolvedValue(row());

      await service.update({ id: 'conn_1', label: '  Anthropic  ' });

      expect(
        (mockPrisma.aiProviderConnection.update.mock.calls[0][0].data as never)[
          'label'
        ],
      ).toBe('Anthropic');
    });

    test('refuses a connection that lists the same model twice', async () => {
      // Two identical picker entries sharing a key, both marked selected.
      expect(
        await service.create({
          ...validInput,
          models: ['gpt-5.6-luna', 'gpt-5.6-luna'],
        }),
      ).toEqualLeft(AI_PROVIDER_MODELS_INVALID);
    });

    test('still allows the same key twice under different labels', async () => {
      // A "fast" and a "deep" grouping off one key is a legitimate setup, so
      // only the label is policed — never the credential.
      mockPrisma.aiProviderConnection.findFirst.mockResolvedValue(null);
      mockPrisma.aiProviderConnection.count.mockResolvedValue(1);
      mockPrisma.aiProviderConnection.create.mockResolvedValue(row());
      mockPrisma.aiProviderConnection.findUnique.mockResolvedValue(row());

      const res = await service.create({
        ...validInput,
        label: 'OpenAI deep',
        apiKey: 'sk-secret-value',
      });

      expect(res).toBeRight();
      expect(mockPrisma.aiProviderConnection.create).toHaveBeenCalled();
    });
  });
});
