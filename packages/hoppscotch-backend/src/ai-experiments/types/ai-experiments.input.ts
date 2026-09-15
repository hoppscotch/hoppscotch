import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ChatInput {
  @IsArray()
  // The chat UI sends at most ~50 history entries plus the tool-use loop's
  // echoed turns; anything beyond that is not a legitimate client.
  @ArrayMaxSize(100)
  // Conversation history. `content` is a plain string, or Anthropic-style
  // content blocks (text / tool_use / tool_result) while the client drives a
  // multi-step tool-use loop.
  messages: { role: string; content: string | unknown[] }[];

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  context?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  // Which admin-registered connection the model belongs to. Omitted means the
  // instance default.
  connectionID?: string;
}
