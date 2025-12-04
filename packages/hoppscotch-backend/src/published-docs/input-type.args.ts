import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, Matches } from 'class-validator';
import { WorkspaceType } from 'src/types/WorkspaceTypes';

@InputType()
export class CreatePublishedDocsArgs {
  @Field({
    name: 'title',
    description: 'Title of the published document',
  })
  title: string;

  @Field({
    name: 'version',
    description: 'Version of the published document',
  })
  @Matches(/^[a-zA-Z0-9.-]+$/, {
    message:
      'Version must only contain alphanumeric characters, dots, and hyphens',
  })
  version: string;

  @Field({
    name: 'autoSync',
    description:
      'Whether the published document should auto-sync with the source',
  })
  autoSync: boolean;

  @Field(() => WorkspaceType, {
    name: 'workspaceType',
    description: 'Type of the workspace (e.g., personal, team)',
  })
  workspaceType: WorkspaceType;

  @Field({
    name: 'workspaceID',
    description: 'ID of the workspace',
  })
  workspaceID: string;

  @Field({
    name: 'collectionID',
    description:
      'ID of the source (personal/team) collection from which to publish',
  })
  collectionID: string;

  @Field({
    name: 'metadata',
    description: 'Metadata associated with the published document',
  })
  metadata: string;
}

@InputType()
export class UpdatePublishedDocsArgs {
  @Field({
    name: 'title',
    description: 'Title of the published document',
    nullable: true,
  })
  title?: string;

  @Field({
    name: 'version',
    description: 'Version of the published document',
    nullable: true,
  })
  @IsOptional()
  @Matches(/^[a-zA-Z0-9.-]+$/, {
    message:
      'Version must only contain alphanumeric characters, dots, and hyphens',
  })
  version?: string;

  @Field({
    name: 'autoSync',
    description:
      'Whether the published document should auto-sync with the source',
    nullable: true,
  })
  autoSync?: boolean;

  @Field({
    name: 'metadata',
    description: 'Metadata associated with the published document',
    nullable: true,
  })
  metadata?: string;
}
