import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * An AI provider connection as the admin dashboard sees it.
 *
 * There is deliberately no `apiKey` field. The key is encrypted on write and
 * never selected back — the only signal a client gets is `hasApiKey`, which is
 * the same set-once shape infra tokens use. Every other admin secret in this
 * codebase round-trips to the browser in the clear; this one does not.
 */
@ObjectType()
export class AIProviderConnection {
  @Field(() => ID, { description: 'Connection identifier' })
  id: string;

  @Field({ description: 'Name the user sees in the model picker' })
  label: string;

  @Field({ description: 'Provider preset, e.g. anthropic, openai, azure' })
  preset: string;

  @Field({
    nullable: true,
    description: "Endpoint, where it differs from the preset's own",
  })
  baseURL: string | null;

  @Field(() => [String], { description: 'Models this connection offers' })
  models: string[];

  @Field({ description: 'Model used when the user picks none' })
  defaultModel: string;

  @Field({ description: 'Whether the assistant may use this connection' })
  enabled: boolean;

  @Field({ description: 'Used when a request names no connection' })
  isDefault: boolean;

  @Field({
    description: 'Whether a key is stored; the key itself never leaves',
  })
  hasApiKey: boolean;

  @Field({ description: 'Date the connection was added' })
  createdOn: Date;

  @Field({ description: 'Date the connection was last changed' })
  updatedOn: Date;
}

/**
 * What the CHAT UI is allowed to know: enough to draw a model picker, and
 * nothing about endpoints or credentials.
 */
@ObjectType()
export class AIChatModelOption {
  @Field(() => ID, { description: 'Connection this model belongs to' })
  connectionID: string;

  @Field({ description: 'Connection label, shown as the group heading' })
  connectionLabel: string;

  @Field({
    description: 'Provider preset, so the picker can show the right mark',
  })
  preset: string;

  @Field({ description: 'Model identifier to send back with a chat request' })
  model: string;

  @Field({ description: 'Whether this is the instance default' })
  isDefault: boolean;
}

/**
 * A provider preset, as the admin form needs to describe it.
 *
 * Served from the same table the validator reads, so the form cannot offer a
 * preset the server would reject or omit a field it would insist on.
 */
@ObjectType()
export class AIProviderPreset {
  @Field({
    description: 'Preset identifier, sent back when adding a connection',
  })
  name: string;

  @Field({ description: 'Request dialect the preset speaks' })
  dialect: string;

  @Field({
    nullable: true,
    description: 'Shape of the endpoint this preset needs spelled out',
  })
  baseURLHint: string | null;

  @Field({
    nullable: true,
    description: 'Endpoint used when none is given',
  })
  defaultBaseURL: string | null;

  @Field({ description: 'Whether an endpoint must be supplied' })
  requiresBaseURL: boolean;

  @Field(() => [String], {
    description: 'Model ids to offer as a starting point, never exhaustive',
  })
  suggestedModels: string[];

  @Field({
    description: 'Whether these capabilities come from a live call, not docs',
  })
  verified: boolean;
}

/**
 * The outcome of one live call to one model.
 *
 * Carries no credential and no endpoint — only whether the call worked, how
 * long it took, and the provider's own reason when it did not.
 */
@ObjectType()
export class AIProviderTestResult {
  @Field({ description: 'Model this result is about' })
  model: string;

  @Field({ description: 'Whether the provider served a turn' })
  ok: boolean;

  @Field(() => Int, { description: 'Round-trip time in milliseconds' })
  latencyMs: number;

  @Field({
    nullable: true,
    description: 'Failure category: auth, not_found, bad_request, and so on',
  })
  reason: string | null;

  @Field({
    nullable: true,
    description: "The provider's own message, with the credential removed",
  })
  detail: string | null;
}

/**
 * Instance-wide assistant settings.
 *
 * Every override is nullable and null means "follow the preset" — not false.
 * Most presets declare their capabilities from vendor documentation, so an
 * unset override has to leave that declaration alone.
 */
@ObjectType()
export class AISettings {
  @Field({ description: 'Whether the assistant is available on this instance' })
  enabled: boolean;

  @Field(() => Int, {
    nullable: true,
    description: 'Request timeout in milliseconds',
  })
  timeoutMs: number | null;

  @Field(() => Int, {
    nullable: true,
    description: 'How many times a failed request is retried',
  })
  maxRetries: number | null;

  @Field({
    nullable: true,
    description:
      'Force server-side tool search on or off, or null to follow the preset',
  })
  toolSearch: boolean | null;

  @Field({
    nullable: true,
    description: 'Force prompt caching on or off, or null to follow the preset',
  })
  promptCaching: boolean | null;

  @Field({
    nullable: true,
    description: 'Sent as reasoning_effort where the dialect supports it',
  })
  reasoningEffort: string | null;
}

/**
 * A named prompt the assistant offers under "/" in the composer.
 *
 * Carries no credential and nothing instance-specific beyond what an admin
 * wrote, so the chat-facing query needs only an ordinary signed-in session.
 */
@ObjectType()
export class AISkill {
  @Field(() => ID, { description: 'Skill identifier' })
  id: string;

  @Field({ description: 'What the user types after "/"' })
  slug: string;

  @Field({ description: 'Name shown in the menu' })
  title: string;

  @Field({ description: 'One line explaining what it does' })
  description: string;

  @Field({ description: 'The instruction dropped into the composer' })
  prompt: string;

  @Field({ description: 'Whether the assistant offers it' })
  enabled: boolean;

  @Field({ description: 'Date the skill was added' })
  createdOn: Date;

  @Field({ description: 'Date the skill was last changed' })
  updatedOn: Date;
}
