import { Field, ID, ObjectType, ArgsType, InputType } from '@nestjs/graphql';
import { User } from 'src/user/user.model';
import { UserCollection } from 'src/user-collection/user-collections.model';

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

  @Field(() => User, {
    description: 'User who created the mock server',
  })
  user: User;

  @Field(() => UserCollection, {
    description: 'Collection associated with the mock server',
  })
  collection: UserCollection;

  @Field({
    description: 'Whether the mock server is active',
  })
  isActive: boolean;

  @Field({
    description: 'Date and time when the mock server was created',
  })
  createdOn: Date;

  @Field({
    description: 'Date and time when the mock server was last updated',
  })
  updatedOn: Date;
}

@InputType()
export class CreateMockServerInput {
  @Field({
    description: 'Name of the mock server',
  })
  name: string;

  @Field({
    description: 'ID of the collection to associate with the mock server',
  })
  collectionID: string;
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
    description: 'Whether the mock server is active',
  })
  isActive?: boolean;
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
