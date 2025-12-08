import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';

@ObjectType()
export class PublishedDocsVersion {
  @Field(() => ID, {
    description: 'ID of the published document version',
  })
  @ApiProperty({
    description: 'ID of the published document version',
    example: 'doc_12345',
  })
  id: string;

  @Field(() => String, {
    description: 'Slug of the published document',
  })
  @ApiProperty({
    description: 'Slug of the published document',
    example: 'abc-123-uuid',
  })
  slug: string;

  @Field(() => String, {
    description: 'Version string',
  })
  @ApiProperty({
    description: 'Version string',
    example: '1.0.0',
  })
  version: string;

  @Field(() => String, {
    description: 'Title of the API documentation',
  })
  @ApiProperty({
    description: 'Title of the API documentation',
    example: 'API Documentation v1.0',
  })
  title: string;

  @Field(() => Boolean, {
    description: 'Indicates if the documentation is set to auto-sync',
  })
  @ApiProperty({
    description: 'Indicates if the documentation is set to auto-sync',
    example: true,
  })
  autoSync: boolean;

  @Field(() => String, {
    description: 'URL where the published API documentation can be accessed',
  })
  @ApiProperty({
    description: 'URL where the published API documentation can be accessed',
    example: 'https://docs.example.com/api/v1.0',
  })
  url: string;
}

@ObjectType()
export class PublishedDocs {
  @Field(() => ID, {
    description: 'ID of the published API documentation',
  })
  @ApiProperty({
    description: 'ID of the published API documentation',
    example: 'doc_12345',
  })
  id: string;

  @Field(() => ID, {
    description:
      'Slug of the published API documentation (unique with version)',
  })
  @ApiProperty({
    description:
      'Slug of the published API documentation (unique with version)',
    example: 'my-api-docs',
  })
  slug: string;

  @Field({ description: 'Title of the published API documentation' })
  @ApiProperty({
    description: 'Title of the published API documentation',
    example: 'My API Documentation',
  })
  title: string;

  @Field({
    description: 'URL where the published API documentation can be accessed',
  })
  @ApiProperty({
    description: 'URL where the published API documentation can be accessed',
    example: 'https://docs.example.com/api',
  })
  url: string;

  @Field({ description: 'Version of the published API documentation' })
  @ApiProperty({
    description: 'Version of the published API documentation',
    example: '1.0.0',
  })
  version: string;

  @Field({ description: 'Indicates if the documentation is set to auto-sync' })
  @ApiProperty({
    description: 'Indicates if the documentation is set to auto-sync',
    example: true,
  })
  autoSync: boolean;

  @Field({
    description: 'Document tree structure associated with the documentation',
  })
  @ApiProperty({
    description: 'Document tree structure associated with the documentation',
    example:
      '{"id": "string", "name": "string", "folders": [], "requests": [], "data": "string"}',
  })
  documentTree: string;

  @Field({
    description:
      'Type of workspace associated with the published documentation',
  })
  @ApiProperty({
    description:
      'Type of workspace associated with the published documentation',
    example: 'team',
  })
  workspaceType: string;

  @Field({
    description:
      'Workspace ID (of team/user ID) associated with the published documentation',
  })
  @ApiProperty({
    description:
      'Workspace ID (of team/user ID) associated with the published documentation',
    example: 'workspace_12345',
  })
  workspaceID: string;

  @Field({ description: 'Metadata of the documentation' })
  @ApiProperty({
    description: 'Metadata of the documentation',
    example: '{"author": "John Doe", "tags": ["api", "rest"]}',
  })
  metadata: string;

  @Field({ description: 'Timestamp when the documentation was created' })
  @ApiProperty({
    description: 'Timestamp when the documentation was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdOn: Date;

  @Field({ description: 'Timestamp when the documentation was last updated' })
  @ApiProperty({
    description: 'Timestamp when the documentation was last updated',
    example: '2024-01-15T12:30:00.000Z',
  })
  updatedOn: Date;

  @ApiProperty({
    description: 'All available versions of this published documentation',
    type: [PublishedDocsVersion],
    required: false,
  })
  versions?: PublishedDocsVersion[];
}

@ObjectType()
export class PublishedDocsCollection {
  @Field(() => ID, {
    description: 'ID of the collection',
  })
  @ApiProperty({
    description: 'ID of the collection',
    example: 'collection_12345',
  })
  id: string;

  @Field({
    description: 'Title of the collection',
  })
  @ApiProperty({
    description: 'Title of the collection',
    example: 'My API Collection',
  })
  title: string;
}
