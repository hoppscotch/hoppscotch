import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { AISettingsService } from './ai-settings.service';

const mockPrisma = mockDeep<PrismaService>();
const service = new AISettingsService(mockPrisma);

const row = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    id: 'singleton',
    enabled: true,
    timeoutMs: null,
    maxRetries: null,
    toolSearch: null,
    promptCaching: null,
    reasoningEffort: null,
    updatedOn: new Date(),
    ...over,
  }) as never;

beforeEach(() => mockReset(mockPrisma));

describe('AISettingsService', () => {
  describe('before an admin has saved anything', () => {
    test('reports the assistant as off rather than failing', async () => {
      // There is no seeding step, so no row is the normal first state.
      mockPrisma.aiSettings.findUnique.mockResolvedValue(null);

      expect(await service.get()).toEqual({
        enabled: false,
        timeoutMs: null,
        maxRetries: null,
        toolSearch: null,
        promptCaching: null,
        reasoningEffort: null,
      });
    });

    test('overrides nothing, so every preset keeps its own declaration', async () => {
      mockPrisma.aiSettings.findUnique.mockResolvedValue(null);

      expect(await service.overrides()).toEqual({
        toolSearch: undefined,
        promptCaching: undefined,
        reasoningEffort: undefined,
        timeoutMs: undefined,
        maxRetries: undefined,
      });
    });

    test('creates the row on first write', async () => {
      mockPrisma.aiSettings.upsert.mockResolvedValue(row());

      await service.update({ enabled: true });

      expect(mockPrisma.aiSettings.upsert.mock.calls[0][0]).toMatchObject({
        where: { id: 'singleton' },
        create: { id: 'singleton', enabled: true },
      });
    });
  });

  describe('overrides', () => {
    test('distinguishes "follow the preset" from "force it off"', async () => {
      // This is the whole reason the columns are nullable: null must leave the
      // preset's declaration alone, false must overrule it.
      mockPrisma.aiSettings.findUnique.mockResolvedValue(
        row({ toolSearch: false, promptCaching: null }),
      );

      const overrides = await service.overrides();

      expect(overrides.toolSearch).toBe(false);
      expect(overrides.promptCaching).toBeUndefined();
    });

    test('passes a zero retry count through as a real choice', async () => {
      mockPrisma.aiSettings.findUnique.mockResolvedValue(
        row({ maxRetries: 0 }),
      );

      expect((await service.overrides()).maxRetries).toBe(0);
    });

    test('carries the tuning an admin set', async () => {
      mockPrisma.aiSettings.findUnique.mockResolvedValue(
        row({ timeoutMs: 45_000, reasoningEffort: 'medium' }),
      );

      const overrides = await service.overrides();

      expect(overrides.timeoutMs).toBe(45_000);
      expect(overrides.reasoningEffort).toBe('medium');
    });
  });

  describe('update', () => {
    test('leaves out what the form did not send', async () => {
      mockPrisma.aiSettings.upsert.mockResolvedValue(row());

      await service.update({ enabled: true });

      const data = mockPrisma.aiSettings.upsert.mock.calls[0][0].update;
      expect(data).toEqual({ enabled: true });
    });

    test('writes an explicit null to clear an override', async () => {
      mockPrisma.aiSettings.upsert.mockResolvedValue(row());

      await service.update({ toolSearch: null, promptCaching: false });

      expect(mockPrisma.aiSettings.upsert.mock.calls[0][0].update).toEqual({
        toolSearch: null,
        promptCaching: false,
      });
    });

    test('treats a blank reasoning effort as cleared, not as empty text', async () => {
      mockPrisma.aiSettings.upsert.mockResolvedValue(row());

      await service.update({ reasoningEffort: '' });

      expect(mockPrisma.aiSettings.upsert.mock.calls[0][0].update).toEqual({
        reasoningEffort: null,
      });
    });
  });

  test('isEnabled follows the stored toggle', async () => {
    mockPrisma.aiSettings.findUnique.mockResolvedValue(row({ enabled: false }));
    expect(await service.isEnabled()).toBe(false);

    mockPrisma.aiSettings.findUnique.mockResolvedValue(row({ enabled: true }));
    expect(await service.isEnabled()).toBe(true);
  });
});
