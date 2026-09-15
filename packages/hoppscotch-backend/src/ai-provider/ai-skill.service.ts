import { Injectable } from '@nestjs/common';
import * as E from 'fp-ts/Either';
import { AiSkill as DbSkill } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AI_SKILL_INCOMPLETE,
  AI_SKILL_INVALID_SLUG,
  AI_SKILL_NOT_FOUND,
  AI_SKILL_SLUG_TAKEN,
} from 'src/errors';
import { AISkill } from './ai-provider.model';
import { CreateAISkillInput, UpdateAISkillInput } from './request-response.dto';

/**
 * What a slug may contain.
 *
 * It is typed after "/" in the composer and filtered on as the user types, so
 * it has to be one unambiguous token: lowercase, digits, dashes, no leading or
 * trailing dash.
 */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class AISkillService {
  constructor(private readonly prisma: PrismaService) {}

  private cast(row: DbSkill): AISkill {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      prompt: row.prompt,
      enabled: row.enabled,
      createdOn: row.createdOn,
      updatedOn: row.updatedOn,
    };
  }

  private validate(fields: {
    slug: string;
    title: string;
    description: string;
    prompt: string;
  }): E.Either<string, true> {
    if (!SLUG.test(fields.slug)) return E.left(AI_SKILL_INVALID_SLUG);

    // All three carry weight: the title and description are how a skill is
    // found in the menu, the prompt is the only part that does anything.
    if (
      !fields.title.trim() ||
      !fields.description.trim() ||
      !fields.prompt.trim()
    ) {
      return E.left(AI_SKILL_INCOMPLETE);
    }
    return E.right(true);
  }

  private async slugIsTaken(slug: string, exceptID?: string) {
    const clash = await this.prisma.aiSkill.findFirst({
      where: { slug, ...(exceptID ? { id: { not: exceptID } } : {}) },
    });
    return !!clash;
  }

  async getAll(): Promise<AISkill[]> {
    const rows = await this.prisma.aiSkill.findMany({
      orderBy: [{ orderIndex: 'asc' }, { createdOn: 'asc' }],
    });
    return rows.map((row) => this.cast(row));
  }

  /**
   * The skills the chat may offer.
   *
   * Only the enabled ones, and the client merges them over its built-in set —
   * a row whose slug matches a built-in replaces it.
   */
  async listForChat(): Promise<AISkill[]> {
    const rows = await this.prisma.aiSkill.findMany({
      where: { enabled: true },
      orderBy: [{ orderIndex: 'asc' }, { createdOn: 'asc' }],
    });
    return rows.map((row) => this.cast(row));
  }

  async create(input: CreateAISkillInput): Promise<E.Either<string, AISkill>> {
    const slug = input.slug.trim().toLowerCase();

    const valid = this.validate({ ...input, slug });
    if (E.isLeft(valid)) return valid;

    if (await this.slugIsTaken(slug)) return E.left(AI_SKILL_SLUG_TAKEN);

    const existing = await this.prisma.aiSkill.count();
    const row = await this.prisma.aiSkill.create({
      data: {
        slug,
        title: input.title.trim(),
        description: input.description.trim(),
        prompt: input.prompt.trim(),
        enabled: input.enabled ?? true,
        orderIndex: existing,
      },
    });

    return E.right(this.cast(row));
  }

  async update(input: UpdateAISkillInput): Promise<E.Either<string, AISkill>> {
    const current = await this.prisma.aiSkill.findUnique({
      where: { id: input.id },
    });
    if (!current) return E.left(AI_SKILL_NOT_FOUND);

    const merged = {
      slug: (input.slug ?? current.slug).trim().toLowerCase(),
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      prompt: input.prompt ?? current.prompt,
    };

    const valid = this.validate(merged);
    if (E.isLeft(valid)) return valid;

    if (await this.slugIsTaken(merged.slug, input.id)) {
      return E.left(AI_SKILL_SLUG_TAKEN);
    }

    const row = await this.prisma.aiSkill.update({
      where: { id: input.id },
      data: {
        slug: merged.slug,
        title: merged.title.trim(),
        description: merged.description.trim(),
        prompt: merged.prompt.trim(),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
      },
    });

    return E.right(this.cast(row));
  }

  async delete(id: string): Promise<E.Either<string, boolean>> {
    const row = await this.prisma.aiSkill.findUnique({ where: { id } });
    if (!row) return E.left(AI_SKILL_NOT_FOUND);

    await this.prisma.aiSkill.delete({ where: { id } });
    return E.right(true);
  }
}
