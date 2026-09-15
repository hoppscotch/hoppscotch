import { Injectable } from '@nestjs/common';
import * as E from 'fp-ts/Either';
import { AiProviderConnection as DbConnection } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { decrypt, encrypt } from 'src/utils';
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
import {
  ChatConnection,
  requiresBaseURLFor,
  connectionFromPreset,
  isKnownPreset,
  validateModelForPreset,
} from 'src/ai-experiments/ai-experiments.providers';
import {
  AIChatModelOption,
  AIProviderConnection,
  AIProviderTestResult,
} from './ai-provider.model';
import { testChatConnection } from './ai-provider.tester';
import {
  CreateAIProviderConnectionInput,
  TestAIProviderConnectionInput,
  UpdateAIProviderConnectionInput,
} from './request-response.dto';

@Injectable()
export class AIProviderService {
  constructor(private readonly prisma: PrismaService) {}

  LABEL_MIN_LENGTH = 2;

  /**
   * Database row to the model a client may see.
   *
   * The credential is reduced to a boolean here and nowhere else decrypts for
   * a resolver, so there is no path by which a key reaches a browser.
   */
  private cast(row: DbConnection): AIProviderConnection {
    return {
      id: row.id,
      label: row.label,
      preset: row.preset,
      baseURL: row.baseURL,
      models: row.models,
      defaultModel: row.defaultModel,
      enabled: row.enabled,
      isDefault: row.isDefault,
      hasApiKey: !!row.apiKey,
      createdOn: row.createdOn,
      updatedOn: row.updatedOn,
    };
  }

  /**
   * Checks the fields that would otherwise fail at call time, or worse, not
   * fail at all — a Bedrock model missing its region profile, or a DeepSeek
   * connection pointed at a Claude model it would silently substitute.
   */
  private validate(fields: {
    label: string;
    preset: string;
    baseURL?: string | null;
    models: string[];
    defaultModel: string;
  }): E.Either<string, true> {
    if (fields.label.trim().length < this.LABEL_MIN_LENGTH) {
      return E.left(AI_PROVIDER_LABEL_SHORT);
    }
    if (!isKnownPreset(fields.preset)) {
      return E.left(AI_PROVIDER_INVALID_PRESET);
    }
    if (!fields.models.length || !fields.models.includes(fields.defaultModel)) {
      return E.left(AI_PROVIDER_MODELS_INVALID);
    }
    // A model listed twice gives the picker two identical entries sharing a key
    // and both marked selected. The form already dedupes; this covers a caller
    // that does not.
    if (new Set(fields.models).size !== fields.models.length) {
      return E.left(AI_PROVIDER_MODELS_INVALID);
    }
    if (requiresBaseURLFor(fields.preset) && !fields.baseURL) {
      return E.left(AI_PROVIDER_BASE_URL_REQUIRED);
    }
    for (const model of fields.models) {
      if (validateModelForPreset(fields.preset, model).level === 'error') {
        return E.left(AI_PROVIDER_MODEL_REJECTED);
      }
    }
    return E.right(true);
  }

  /**
   * Whether another connection already answers to this label.
   *
   * The label is the ONLY thing that distinguishes two connections: the cards
   * show nothing else that differs, the picker groups by it, and the delete
   * confirmation names it. Two connections sharing one is always a mistake,
   * even though sharing a key is not — registering the same key twice with
   * different model lists is a legitimate setup, and stays allowed.
   *
   * Compared case-insensitively on the trimmed value: "Anthropic" and
   * "anthropic " are not two things a human can tell apart either.
   */
  private async labelIsTaken(label: string, exceptID?: string) {
    const clash = await this.prisma.aiProviderConnection.findFirst({
      where: {
        label: { equals: label.trim(), mode: 'insensitive' },
        ...(exceptID ? { id: { not: exceptID } } : {}),
      },
    });
    return !!clash;
  }

  /** At most one connection is the default, so promoting one demotes the rest. */
  private async clearOtherDefaults(keepID: string) {
    await this.prisma.aiProviderConnection.updateMany({
      where: { id: { not: keepID }, isDefault: true },
      data: { isDefault: false },
    });
  }

  /**
   * Hands the default to the next usable connection.
   *
   * Losing the default without replacing it is worse than it looks: the chat
   * quietly falls back to whichever enabled connection sorts first, while the
   * model picker has nothing to mark as default. Called wherever a connection
   * stops being a candidate — deleted, or disabled.
   */
  private async promoteNextDefault() {
    const next = await this.prisma.aiProviderConnection.findFirst({
      where: { enabled: true },
      orderBy: [{ orderIndex: 'asc' }, { createdOn: 'asc' }],
    });
    if (!next) return;

    if (!next.isDefault) {
      await this.prisma.aiProviderConnection.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
    // A disabled row may still carry the flag; exactly one may hold it.
    await this.clearOtherDefaults(next.id);
  }

  /**
   * Guarantees an enabled connection is the default.
   *
   * Enforced after every write rather than at the branches that looked like
   * they needed it: a client that sends `isDefault: false` when adding the
   * first connection, or clears it on the only one that had it, would
   * otherwise leave the instance with no default at all — the picker has
   * nothing to mark and the chat quietly serves whichever row sorts first.
   */
  private async ensureDefaultExists() {
    const existing = await this.prisma.aiProviderConnection.findFirst({
      where: { enabled: true, isDefault: true },
    });
    if (existing) return;

    await this.promoteNextDefault();
  }

  private async byId(id: string) {
    return this.prisma.aiProviderConnection.findUnique({ where: { id } });
  }

  /**
   * The row as it ended up, falling back to what was written.
   *
   * Enforcing the default invariant can change the row that was just written,
   * so returning the pre-invariant copy would report a default the database no
   * longer agrees with.
   */
  private reread(written: DbConnection, current: DbConnection | null) {
    return current ?? written;
  }

  async getAll(): Promise<AIProviderConnection[]> {
    const rows = await this.prisma.aiProviderConnection.findMany({
      orderBy: [{ orderIndex: 'asc' }, { createdOn: 'asc' }],
    });
    return rows.map((row) => this.cast(row));
  }

  async create(
    input: CreateAIProviderConnectionInput,
  ): Promise<E.Either<string, AIProviderConnection>> {
    if (!input.apiKey?.trim()) return E.left(AI_PROVIDER_KEY_REQUIRED);

    const valid = this.validate(input);
    if (E.isLeft(valid)) return valid;

    if (await this.labelIsTaken(input.label)) {
      return E.left(AI_PROVIDER_LABEL_TAKEN);
    }

    const existing = await this.prisma.aiProviderConnection.count();
    const row = await this.prisma.aiProviderConnection.create({
      data: {
        label: input.label.trim(),
        preset: input.preset,
        baseURL: input.baseURL?.trim() || null,
        apiKey: encrypt(input.apiKey),
        models: input.models,
        defaultModel: input.defaultModel,
        enabled: input.enabled ?? true,
        // The first connection added is the default, or nothing would be.
        isDefault: input.isDefault ?? existing === 0,
        orderIndex: existing,
      },
    });
    if (row.isDefault) await this.clearOtherDefaults(row.id);
    await this.ensureDefaultExists();

    return E.right(this.cast(this.reread(row, await this.byId(row.id))));
  }

  async update(
    input: UpdateAIProviderConnectionInput,
  ): Promise<E.Either<string, AIProviderConnection>> {
    const current = await this.prisma.aiProviderConnection.findUnique({
      where: { id: input.id },
    });
    if (!current) return E.left(AI_PROVIDER_NOT_FOUND);

    const merged = {
      label: input.label ?? current.label,
      preset: input.preset ?? current.preset,
      // `undefined` means the field was not sent; an explicit null is the form
      // saying the endpoint was cleared. `??` cannot tell those apart, so it
      // used to write the stale endpoint back and still report success.
      baseURL: input.baseURL === undefined ? current.baseURL : input.baseURL,
      models: input.models ?? current.models,
      defaultModel: input.defaultModel ?? current.defaultModel,
    };
    const valid = this.validate(merged);
    if (E.isLeft(valid)) return valid;

    if (await this.labelIsTaken(merged.label, input.id)) {
      return E.left(AI_PROVIDER_LABEL_TAKEN);
    }

    const row = await this.prisma.aiProviderConnection.update({
      where: { id: input.id },
      data: {
        ...merged,
        // Trimmed on the way in, like create does: a stored "Anthropic " would
        // not match an incoming "Anthropic" and both rows would land, which is
        // exactly the collision labelIsTaken exists to stop.
        label: merged.label.trim(),
        baseURL: merged.baseURL?.trim() || null,
        // Omitting the key keeps the stored one: it cannot be read back, so an
        // edit that does not mean to rotate it must not have to resend it.
        ...(input.apiKey ? { apiKey: encrypt(input.apiKey) } : {}),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
        ...(input.isDefault === undefined
          ? {}
          : { isDefault: input.isDefault }),
      },
    });

    if (!row.enabled && row.isDefault) {
      const demoted = await this.prisma.aiProviderConnection.update({
        where: { id: row.id },
        data: { isDefault: false },
      });
      await this.promoteNextDefault();
      return E.right(this.cast(demoted));
    }

    if (row.isDefault) await this.clearOtherDefaults(row.id);
    await this.ensureDefaultExists();

    return E.right(this.cast(this.reread(row, await this.byId(row.id))));
  }

  async delete(id: string): Promise<E.Either<string, boolean>> {
    const row = await this.prisma.aiProviderConnection.findUnique({
      where: { id },
    });
    if (!row) return E.left(AI_PROVIDER_NOT_FOUND);

    await this.prisma.aiProviderConnection.delete({ where: { id } });

    // promoteNextDefault already leaves exactly one default behind, so the
    // general invariant only needs running when it did not.
    if (row.isDefault) await this.promoteNextDefault();
    else await this.ensureDefaultExists();

    return E.right(true);
  }

  async listModelOptions(): Promise<AIChatModelOption[]> {
    const rows = await this.prisma.aiProviderConnection.findMany({
      where: { enabled: true },
      orderBy: [{ orderIndex: 'asc' }, { createdOn: 'asc' }],
    });
    return rows.flatMap((row) =>
      row.models.map((model) => ({
        connectionID: row.id,
        connectionLabel: row.label,
        preset: row.preset,
        model,
        isDefault: row.isDefault && model === row.defaultModel,
      })),
    );
  }

  /**
   * Resolves the connection a chat turn should use, decrypting the credential.
   *
   * The only method that decrypts, and it is called by the chat service rather
   * than by any resolver. A request naming a connection or model that is not
   * enabled is refused rather than quietly served by the default.
   */
  async resolveForChat(
    connectionID?: string,
    model?: string,
  ): Promise<E.Either<string, ChatConnection>> {
    const row = connectionID
      ? await this.prisma.aiProviderConnection.findUnique({
          where: { id: connectionID },
        })
      : await this.prisma.aiProviderConnection.findFirst({
          where: { enabled: true, isDefault: true },
        });

    const chosen =
      row ??
      (connectionID
        ? null
        : await this.prisma.aiProviderConnection.findFirst({
            where: { enabled: true },
            orderBy: [{ orderIndex: 'asc' }, { createdOn: 'asc' }],
          }));

    if (!chosen || !chosen.enabled) return E.left(AI_PROVIDER_NOT_FOUND);
    if (!isKnownPreset(chosen.preset)) {
      return E.left(AI_PROVIDER_INVALID_PRESET);
    }

    const wanted = model ?? chosen.defaultModel;
    if (!chosen.models.includes(wanted)) {
      return E.left(AI_PROVIDER_MODEL_REJECTED);
    }

    return E.right(
      connectionFromPreset(chosen.preset, {
        apiKey: decrypt(chosen.apiKey),
        baseURL: chosen.baseURL ?? undefined,
        model: wanted,
      }),
    );
  }

  /**
   * Most models one test may try at once.
   *
   * Each is a real, billable call, and a list longer than this is a typo
   * rather than an inventory.
   */
  MAX_TEST_MODELS = 10;

  /**
   * Sends a live probe to each model and reports what came back.
   *
   * Structural validation cannot catch a revoked key, a moved endpoint, or a
   * model id the vendor has retired — every one of those looks perfectly valid
   * until something calls it. This is the only way to know before a user does.
   *
   * Fields given in the input win over the stored row, so the admin tests what
   * is in front of them rather than what was last saved. The one exception is
   * the key: omitted means "use the stored one", because it cannot be read back
   * and an edit should not have to retype it.
   */
  async testConnection(
    input: TestAIProviderConnectionInput,
  ): Promise<E.Either<string, AIProviderTestResult[]>> {
    const stored = input.id
      ? await this.prisma.aiProviderConnection.findUnique({
          where: { id: input.id },
        })
      : null;
    if (input.id && !stored) return E.left(AI_PROVIDER_NOT_FOUND);

    const preset = input.preset ?? stored?.preset;
    if (!preset || !isKnownPreset(preset)) {
      return E.left(AI_PROVIDER_INVALID_PRESET);
    }

    let apiKey = input.apiKey?.trim() ?? '';
    if (!apiKey && stored) {
      // A test exists to diagnose a broken connection, so an unreadable stored
      // key has to come back as an answer rather than as a crash.
      try {
        apiKey = decrypt(stored.apiKey);
      } catch {
        return E.left(AI_PROVIDER_KEY_UNREADABLE);
      }
    }
    if (!apiKey) return E.left(AI_PROVIDER_KEY_REQUIRED);

    const baseURL = input.baseURL?.trim() || stored?.baseURL || undefined;
    if (requiresBaseURLFor(preset) && !baseURL) {
      return E.left(AI_PROVIDER_BASE_URL_REQUIRED);
    }

    const models = (input.models?.length ? input.models : stored?.models) ?? [];
    if (!models.length) return E.left(AI_PROVIDER_MODELS_INVALID);

    const results = await Promise.all(
      models
        .slice(0, this.MAX_TEST_MODELS)
        .map((model) =>
          testChatConnection(
            connectionFromPreset(preset, { apiKey, baseURL, model }),
          ),
        ),
    );

    return E.right(
      results.map((result) => ({
        model: result.model,
        ok: result.ok,
        latencyMs: result.latencyMs,
        reason: result.reason ?? null,
        detail: result.detail ?? null,
      })),
    );
  }

  async hasEnabledConnection(): Promise<boolean> {
    return (
      (await this.prisma.aiProviderConnection.count({
        where: { enabled: true },
      })) > 0
    );
  }
}
