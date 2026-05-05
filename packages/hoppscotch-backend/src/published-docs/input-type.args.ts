import { InputType, Field, ArgsType, ID } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { OffsetPaginationArgs } from 'src/types/input-types.args';
import { WorkspaceType } from 'src/types/WorkspaceTypes';

@ArgsType()
export class FetchPublishedDocsArgs extends OffsetPaginationArgs {
  @IsNotEmpty()
  @Field(() => ID, {
    name: 'teamID',
    description: 'ID of the team',
  })
  teamID: string;

  @Field(() => ID, {
    name: 'collectionID',
    description: 'Id of the collection to add to',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  collectionID: string | undefined;
}

@InputType()
export class CreatePublishedDocsArgs {
  @IsString()
  @IsNotEmpty()
  @Field({
    name: 'title',
    description: 'Title of the published document',
  })
  title: string;

  @IsString()
  @IsNotEmpty()
  @Field({
    name: 'version',
    description: 'Version of the published document',
  })
  @Matches(/^[a-zA-Z0-9.-]+$/, {
    message:
      'Version must only contain alphanumeric characters, dots, and hyphens',
  })
  version: string;

  @IsBoolean()
  @Field({
    name: 'autoSync',
    description:
      'Whether the published document should auto-sync with the source',
  })
  autoSync: boolean;

  @IsEnum(WorkspaceType)
  @Field(() => WorkspaceType, {
    name: 'workspaceType',
    description: 'Type of the workspace (e.g., personal, team)',
  })
  workspaceType: WorkspaceType;

  @IsString()
  @IsNotEmpty()
  @Field({
    name: 'workspaceID',
    description: 'ID of the workspace',
  })
  workspaceID: string;

  @IsString()
  @IsNotEmpty()
  @Field({
    name: 'collectionID',
    description:
      'ID of the source (personal/team) collection from which to publish',
  })
  collectionID: string;

  @IsString()
  @IsNotEmpty()
  @Field({
    name: 'metadata',
    description: 'Metadata associated with the published document',
  })
  metadata: string;

  @Field({
    name: 'environmentID',
    description:
      'ID of the environment to associate with the published document',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  environmentID?: string;
}

@InputType()
export class UpdatePublishedDocsArgs {
  @Field({
    name: 'title',
    description: 'Title of the published document',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @Field({
    name: 'version',
    description: 'Version of the published document',
    nullable: true,
  })
  @IsString()
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
  @IsBoolean()
  @IsOptional()
  autoSync?: boolean;

  @Field({
    name: 'metadata',
    description: 'Metadata associated with the published document',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  metadata?: string;

  @Field({
    name: 'environmentID',
    description:
      'ID of the environment to associate with the published document. Pass null to remove the environment.',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  environmentID?: string;
}
