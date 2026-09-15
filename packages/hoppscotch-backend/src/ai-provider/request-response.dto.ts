import { Field, ID, InputType, Int } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  Max,
  Min,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

/**
 * An endpoint has to be an absolute http(s) URL, but it does NOT have to be a
 * public one: pointing a connection at Ollama or vLLM on localhost is a first
 * class case, which is why the TLD requirement is off.
 */
const BASE_URL_RULE = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: false,
};

/** What the dialects accept for `reasoning_effort`. */
const REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high'];

@InputType()
export class CreateAIProviderConnectionInput {
  @Field({ description: 'Name the user sees in the model picker' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label: string;

  @Field({ description: 'Provider preset, e.g. anthropic, openai, azure' })
  @IsString()
  @IsNotEmpty()
  preset: string;

  @Field({
    nullable: true,
    description: 'Endpoint, where the preset needs one',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl(BASE_URL_RULE)
  baseURL?: string;

  @Field({
    description: 'Provider credential. Stored encrypted, never read back',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  apiKey: string;

  @Field(() => [String], { description: 'Models this connection offers' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  // Matches the cap the chat request applies, so a model id cannot reach the
  // picker and then be rejected the moment it is chosen.
  @MaxLength(200, { each: true })
  models: string[];

  @Field({ description: 'Model used when the user picks none' })
  @IsString()
  @IsNotEmpty()
  defaultModel: string;

  @Field({ nullable: true, description: 'Whether the assistant may use it' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Field({ nullable: true, description: 'Make this the instance default' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@InputType()
export class UpdateAIProviderConnectionInput {
  @Field(() => ID, { description: 'Connection to change' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  preset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl(BASE_URL_RULE)
  baseURL?: string;

  @Field({
    nullable: true,
    description: 'Replace the credential. Omit to keep it',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  models?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

/**
 * What to test. Shaped to match the admin form rather than the stored row:
 * whatever the admin has typed is what gets tried, so a test proves the thing
 * they are about to save.
 *
 * `id` names an existing connection, which lets the key be omitted — it cannot
 * be read back, so requiring it would mean an edit could never be tested
 * without retyping the credential.
 */
@InputType()
export class TestAIProviderConnectionInput {
  @Field(() => ID, {
    nullable: true,
    description: 'Existing connection, to fall back on its stored values',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @Field({ nullable: true, description: 'Required when no id is given' })
  @IsOptional()
  @IsString()
  preset?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl(BASE_URL_RULE)
  baseURL?: string;

  @Field({
    nullable: true,
    description: 'Omit to test with the stored key of the named connection',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @Field(() => [String], {
    nullable: true,
    description: "Models to try; defaults to the connection's own",
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  models?: string[];
}

/**
 * Changes to the instance settings. Every field is optional; omitted means
 * "leave it", and an explicit null clears an override.
 */
@InputType()
export class UpdateAISettingsInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(600_000)
  timeoutMs?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number | null;

  @Field({ nullable: true, description: 'Null follows the preset' })
  @IsOptional()
  @IsBoolean()
  toolSearch?: boolean | null;

  @Field({ nullable: true, description: 'Null follows the preset' })
  @IsOptional()
  @IsBoolean()
  promptCaching?: boolean | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(REASONING_EFFORTS)
  reasoningEffort?: string | null;
}

@InputType()
export class CreateAISkillInput {
  @Field({ description: 'What the user types after "/"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  slug: string;

  @Field({ description: 'Name shown in the menu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  title: string;

  @Field({ description: 'One line explaining what it does' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @Field({ description: 'The instruction dropped into the composer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  prompt: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

@InputType()
export class UpdateAISkillInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  slug?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
