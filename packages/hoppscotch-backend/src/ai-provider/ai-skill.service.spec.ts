import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AI_SKILL_INCOMPLETE,
  AI_SKILL_INVALID_SLUG,
  AI_SKILL_NOT_FOUND,
  AI_SKILL_SLUG_TAKEN,
} from 'src/errors';
import { AISkillService } from './ai-skill.service';

const mockPrisma = mockDeep<PrismaService>();
const service = new AISkillService(mockPrisma);

const row = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    id: 'skill_1',
    slug: 'debug-request',
    title: 'Debug request',
    description: 'Isolate why a request is failing',
    prompt: 'Look at the request and response and tell me what is wrong.',
    enabled: true,
    orderIndex: 0,
    createdOn: new Date(),
    updatedOn: new Date(),
    ...over,
  }) as never;

const validInput = {
  slug: 'debug-request',
  title: 'Debug request',
  description: 'Isolate why a request is failing',
  prompt: 'Look at the request and response and tell me what is wrong.',
};

beforeEach(() => mockReset(mockPrisma));

describe('AISkillService', () => {
  describe('the slug is what the user types', () => {
    test.each([
      ['Debug Request', 'capitals and a space'],
      ['debug request', 'a space'],
      ['debug_request', 'an underscore'],
      ['-debug', 'a leading dash'],
      ['debug-', 'a trailing dash'],
      ['debug--request', 'a double dash'],
      ['', 'nothing at all'],
      ['déboguer', 'an accent'],
    ])('refuses %j — %s', async (slug) => {
      expect(await service.create({ ...validInput, slug })).toEqualLeft(
        AI_SKILL_INVALID_SLUG,
      );
    });

    test.each(['debug-request', 'debug', 'write-tests-2', 'a1'])(
      'accepts %j',
      async (slug) => {
        mockPrisma.aiSkill.findFirst.mockResolvedValue(null);
        mockPrisma.aiSkill.count.mockResolvedValue(0);
        mockPrisma.aiSkill.create.mockResolvedValue(row({ slug }));

        expect(await service.create({ ...validInput, slug })).toBeRight();
      },
    );

    test('lowercases on the way in, since "/" matching is case-blind', async () => {
      mockPrisma.aiSkill.findFirst.mockResolvedValue(null);
      mockPrisma.aiSkill.count.mockResolvedValue(0);
      mockPrisma.aiSkill.create.mockResolvedValue(row());

      await service.create({ ...validInput, slug: '  DEBUG-REQUEST  ' });

      expect(
        (mockPrisma.aiSkill.create.mock.calls[0][0].data as never)['slug'],
      ).toBe('debug-request');
    });

    test('refuses a slug another skill already answers to', async () => {
      // Two skills under one "/" name means the menu offers a coin flip.
      mockPrisma.aiSkill.findFirst.mockResolvedValue(row());

      expect(await service.create(validInput)).toEqualLeft(AI_SKILL_SLUG_TAKEN);
      expect(mockPrisma.aiSkill.create).not.toHaveBeenCalled();
    });

    test('lets a skill keep its own slug when edited', async () => {
      mockPrisma.aiSkill.findUnique.mockResolvedValue(row());
      mockPrisma.aiSkill.findFirst.mockResolvedValue(null);
      mockPrisma.aiSkill.update.mockResolvedValue(row());

      expect(
        await service.update({ id: 'skill_1', title: 'Debug' }),
      ).toBeRight();
      expect(mockPrisma.aiSkill.findFirst.mock.calls[0][0]).toMatchObject({
        where: { id: { not: 'skill_1' } },
      });
    });
  });

  describe('a skill has to actually do something', () => {
    test.each([
      ['title', { title: '   ' }],
      ['description', { description: '' }],
      ['prompt', { prompt: '  ' }],
    ])('refuses one with no %s', async (_field, over) => {
      expect(await service.create({ ...validInput, ...over })).toEqualLeft(
        AI_SKILL_INCOMPLETE,
      );
    });

    test('trims what it stores', async () => {
      mockPrisma.aiSkill.findFirst.mockResolvedValue(null);
      mockPrisma.aiSkill.count.mockResolvedValue(0);
      mockPrisma.aiSkill.create.mockResolvedValue(row());

      await service.create({ ...validInput, title: '  Debug request  ' });

      expect(
        (mockPrisma.aiSkill.create.mock.calls[0][0].data as never)['title'],
      ).toBe('Debug request');
    });
  });

  describe('what the chat is offered', () => {
    test('only the enabled ones', async () => {
      mockPrisma.aiSkill.findMany.mockResolvedValue([row()]);

      await service.listForChat();

      expect(mockPrisma.aiSkill.findMany.mock.calls[0][0]).toMatchObject({
        where: { enabled: true },
      });
    });

    test('the admin sees the disabled ones too', async () => {
      mockPrisma.aiSkill.findMany.mockResolvedValue([row({ enabled: false })]);

      const all = await service.getAll();

      expect(mockPrisma.aiSkill.findMany.mock.calls[0][0]).not.toHaveProperty(
        'where',
      );
      expect(all[0].enabled).toBe(false);
    });
  });

  test('refuses to edit or delete a skill that is gone', async () => {
    mockPrisma.aiSkill.findUnique.mockResolvedValue(null);

    expect(await service.update({ id: 'missing' })).toEqualLeft(
      AI_SKILL_NOT_FOUND,
    );
    expect(await service.delete('missing')).toEqualLeft(AI_SKILL_NOT_FOUND);
  });
});
