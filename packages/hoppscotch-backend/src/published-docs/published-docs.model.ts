import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class PublishedDocs {
  @Field(() => ID, {
    description: 'ID of the published API documentation',
  })
  id: string;

  @Field({ description: 'Title of the published API documentation' })
  title: string;

  @Field({
    description: 'URL where the published API documentation can be accessed',
  })
  url: string;

  @Field({ description: 'Version of the published API documentation' })
  version: string;

  @Field({ description: 'Indicates if the documentation is set to auto-sync' })
  autoSync: boolean;

  @Field({
    description: 'Document tree structure associated with the documentation',
  })
  documentTree: string;

  @Field({
    description:
      'Type of workspace associated with the published documentation',
  })
  workspaceType: string;

  @Field({
    description:
      'Workspace ID (of team/user ID) associated with the published documentation',
    nullable: true,
  })
  workspaceID: string;

  @Field({ description: 'Metadata of the documentation' })
  metadata: string;

  @Field({ description: 'Timestamp when the documentation was created' })
  createdOn: Date;

  @Field({ description: 'Timestamp when the documentation was last updated' })
  updatedOn: Date;
}

@ObjectType()
export class PublishedDocsCollection {
  @Field(() => ID, {
    description: 'ID of the collection',
  })
  id: string;

  @Field({
    description: 'Title of the collection',
  })
  title: string;
}
