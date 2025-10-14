import {
  Field,
  ID,
  ObjectType,
  ArgsType,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import { WorkspaceType } from 'src/types/WorkspaceTypes';

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
  name: string;

  @Field({
    description:
      'ID of the (team or user) collection to associate with the mock server',
  })
  collectionID: string;

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
  name?: string;

  @Field({
    nullable: true,
    description: 'Delay in milliseconds before responding',
  })
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

registerEnumType(WorkspaceType, {
  name: 'WorkspaceType',
});
