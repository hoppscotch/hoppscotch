import { Injectable } from '@nestjs/common';
import { AiSettings as DbSettings } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConnectionOverrides } from 'src/ai-experiments/ai-experiments.providers';
import { AISettings } from './ai-provider.model';
import { UpdateAISettingsInput } from './request-response.dto';

const SINGLETON_ID = 'singleton';

const DEFAULTS: AISettings = {
  enabled: false,
  timeoutMs: null,
  maxRetries: null,
  toolSearch: null,
  promptCaching: null,
  reasoningEffort: null,
};

@Injectable()
export class AISettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private cast(row: DbSettings | null): AISettings {
    if (!row) return { ...DEFAULTS };
    return {
      enabled: row.enabled,
      timeoutMs: row.timeoutMs,
      maxRetries: row.maxRetries,
      toolSearch: row.toolSearch,
      promptCaching: row.promptCaching,
      reasoningEffort: row.reasoningEffort,
    };
  }

  /**
   * Reads the settings, treating a missing row as the defaults.
   *
   * There is no seeding step: an instance that has never opened the AI tab has
   * no row, and that has to mean "off with nothing overridden" rather than an
   * error on every chat turn.
   */
  async get(): Promise<AISettings> {
    return this.cast(
      await this.prisma.aiSettings.findUnique({ where: { id: SINGLETON_ID } }),
    );
  }

  /** Creates the row on first write; there is nothing to create before that. */
  async update(input: UpdateAISettingsInput): Promise<AISettings> {
    const data = {
      ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
      ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
      ...(input.maxRetries === undefined
        ? {}
        : { maxRetries: input.maxRetries }),
      // Null is meaningful here and distinct from undefined: it clears the
      // override so the preset's own declaration applies again.
      ...(input.toolSearch === undefined
        ? {}
        : { toolSearch: input.toolSearch }),
      ...(input.promptCaching === undefined
        ? {}
        : { promptCaching: input.promptCaching }),
      ...(input.reasoningEffort === undefined
        ? {}
        : { reasoningEffort: input.reasoningEffort || null }),
    };

    const row = await this.prisma.aiSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });

    return this.cast(row);
  }

  async isEnabled(): Promise<boolean> {
    return (await this.get()).enabled;
  }

  /**
   * The settings expressed as overrides for a resolved connection.
   *
   * An unset value stays undefined rather than becoming a default, so the
   * preset's own declaration survives — `null` in the row means "no override",
   * which is not the same as `false`.
   */
  async overrides(): Promise<ConnectionOverrides> {
    const settings = await this.get();
    return {
      toolSearch: settings.toolSearch ?? undefined,
      promptCaching: settings.promptCaching ?? undefined,
      reasoningEffort: settings.reasoningEffort ?? undefined,
      timeoutMs: settings.timeoutMs ?? undefined,
      maxRetries: settings.maxRetries ?? undefined,
    };
  }
}
