import {
  Field,
  ID,
  ObjectType,
  ArgsType,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WorkspaceType } from 'src/types/WorkspaceTypes';

// Regex pattern for mock server name validation
// Allows letters, numbers, spaces, dots, brackets, underscores, and hyphens
const MOCK_SERVER_NAME_PATTERN = /^[a-zA-Z0-9 .()[\]{}<>_-]+$/;
const MOCK_SERVER_NAME_ERROR_MESSAGE =
  'Name can only contain letters, numbers, spaces, dots, brackets, underscores, and hyphens';

@ObjectType()
export class MockServer {
  @Field(() => ID, {
    description: 'ID of the mock server',
  })
  id: string;

  @Field({
    description: 'Name of the mock server',
  })
  name: string;

  @Field({
    description: 'Subdomain for the mock server (e.g., mock-1234)',
  })
  subdomain: string;

  @Field({
    nullable: true,
    description:
      'Server URL for the mock server using subdomain pattern (e.g., https://1234.mock.backend-hoppscotch.io)',
  })
  serverUrlDomainBased: string;

  @Field({
    description:
      'Server URL for the mock server using path pattern (e.g., https://backend.hoppscotch.io/mock/1234)',
  })
  serverUrlPathBased: string;

  @Field(() => WorkspaceType, {
    description: 'Type of workspace: USER or TEAM',
  })
  workspaceType: WorkspaceType;

  @Field({
    nullable: true,
    description:
      'ID of the workspace (user or team) to associate with the mock server',
  })
  workspaceID?: string;

  @Field({
    description: 'Delay in milliseconds before responding',
  })
  delayInMs: number;

  @Field({
    description: 'Whether the mock server is active',
  })
  isActive: boolean;

  @Field({
    description: 'Whether the mock server is publicly accessible',
  })
  isPublic: boolean;

  @Field({
    description: 'Date and time when the mock server was created',
  })
  createdOn: Date;

  @Field({
    description: 'Date and time when the mock server was last updated',
  })
  updatedOn: Date;
}

@ObjectType()
export class MockServerCollection {
  @Field(() => ID, {
    description: 'ID of the collection',
  })
  id: string;

  @Field({
    description: 'Title of the collection',
  })
  title: string;
}

@InputType()
export class CreateMockServerInput {
  @Field({
    description: 'Name of the mock server',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(MOCK_SERVER_NAME_PATTERN, {
    message: MOCK_SERVER_NAME_ERROR_MESSAGE,
  })
  name: string;

  @Field({
    nullable: true,
    description:
      'ID of the (team or user) collection to associate with the mock server',
  })
  collectionID?: string;

  @Field({
    nullable: true,
    description:
      'Whether to auto-create a collection for the mock server if collectionID is not provided',
  })
  autoCreateCollection?: boolean;

  @Field({
    nullable: true,
    description:
      'Whether to auto-create request examples in the collection for the mock server',
  })
  autoCreateRequestExample?: boolean;

  @Field(() => WorkspaceType, {
    description: 'Type of workspace: USER or TEAM',
  })
  workspaceType: WorkspaceType;

  @Field({
    nullable: true,
    description:
      'ID of the workspace (user or team) to associate with the mock server',
  })
  workspaceID?: string;

  @Field({
    nullable: true,
    defaultValue: 0,
    description: 'Delay in milliseconds before responding',
  })
  @IsOptional()
  @IsNumber()
  @Max(60000)
  delayInMs?: number;

  @Field({
    nullable: true,
    defaultValue: true,
    description: 'Whether the mock server is publicly accessible',
  })
  isPublic?: boolean;
}

@InputType()
export class UpdateMockServerInput {
  @Field({
    nullable: true,
    description: 'Name of the mock server',
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  @Matches(MOCK_SERVER_NAME_PATTERN, {
    message: MOCK_SERVER_NAME_ERROR_MESSAGE,
  })
  name?: string;

  @Field({
    nullable: true,
    description: 'Delay in milliseconds before responding',
  })
  @IsOptional()
  @IsNumber()
  @Max(60000)
  delayInMs?: number;

  @Field({
    nullable: true,
    description: 'Whether the mock server is active',
  })
  isActive?: boolean;

  @Field({
    nullable: true,
    description: 'Whether the mock server is publicly accessible',
  })
  isPublic?: boolean;
}

@ObjectType()
export class MockServerResponse {
  @Field({
    description: 'HTTP status code to return',
  })
  statusCode: number;

  @Field({
    nullable: true,
    description: 'Response body to return',
  })
  body?: string;

  @Field({
    nullable: true,
    description: 'Response headers as JSON string',
  })
  headers?: string;

  @Field({
    defaultValue: 0,
    description: 'Delay in milliseconds before response',
  })
  delay: number;
}

@ArgsType()
export class MockServerMutationArgs {
  @Field(() => ID, {
    description: 'ID of the mock server',
  })
  id: string;
}

@ObjectType()
export class MockServerLog {
  @Field(() => ID, {
    description: 'ID of the log entry',
  })
  id: string;

  @Field(() => ID, {
    description: 'ID of the mock server',
  })
  mockServerID: string;

  @Field({
    description: 'HTTP method of the request',
  })
  requestMethod: string;

  @Field({
    description: 'Path of the request',
  })
  requestPath: string;

  @Field({
    description: 'Request headers as JSON string',
  })
  requestHeaders: string;

  @Field({
    nullable: true,
    description: 'Request body as JSON string',
  })
  requestBody?: string;

  @Field({
    nullable: true,
    description: 'Request query parameters as JSON string',
  })
  requestQuery?: string;

  @Field({
    description: 'HTTP status code of the response',
  })
  responseStatus: number;

  @Field({
    description: 'Response headers as JSON string',
  })
  responseHeaders: string;

  @Field({
    nullable: true,
    description: 'Response body as JSON string',
  })
  responseBody?: string;

  @Field({
    description: 'Response time in milliseconds',
  })
  responseTime: number;

  @Field({
    nullable: true,
    description: 'IP address of the requester',
  })
  ipAddress?: string;

  @Field({
    nullable: true,
    description: 'User agent of the requester',
  })
  userAgent?: string;

  @Field({
    description: 'Date and time when the request was executed',
  })
  executedAt: Date;
}

registerEnumType(WorkspaceType, {
  name: 'WorkspaceType',
});
