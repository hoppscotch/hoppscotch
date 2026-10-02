import { ArgsType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationArgs } from 'src/types/input-types.args';

@ArgsType()
export class GetRootTeamCollectionsArgs extends PaginationArgs {
  @Field(() => ID, { name: 'teamID', description: 'ID of the team' })
  @IsString()
  @IsNotEmpty()
  teamID: string;
}

@ArgsType()
export class CreateRootTeamCollectionArgs {
  @Field(() => ID, { name: 'teamID', description: 'ID of the team' })
  @IsString()
  @IsNotEmpty()
  teamID: string;

  @Field({ name: 'title', description: 'Title of the new collection' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field({
    name: 'data',
    description: 'JSON string representing the collection data',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  data: string;
}

@ArgsType()
export class CreateChildTeamCollectionArgs {
  @Field(() => ID, {
    name: 'collectionID',
    description: 'ID of the parent to the new collection',
  })
  @IsString()
  @IsNotEmpty()
  collectionID: string;

  @Field({ name: 'childTitle', description: 'Title of the new collection' })
  @IsString()
  @IsNotEmpty()
  childTitle: string;

  @Field({
    name: 'data',
    description: 'JSON string representing the collection data',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  data: string;
}

@ArgsType()
export class RenameTeamCollectionArgs {
  @Field(() => ID, {
    name: 'collectionID',
    description: 'ID of the collection',
  })
  @IsString()
  @IsNotEmpty()
  collectionID: string;

  @Field({
    name: 'newTitle',
    description: 'The updated title of the collection',
  })
  @IsString()
  @IsNotEmpty()
  newTitle: string;
}

@ArgsType()
export class MoveTeamCollectionArgs {
  @Field(() => ID, {
    name: 'parentCollectionID',
    description: 'ID of the parent to the new collection',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  parentCollectionID: string;

  @Field(() => ID, {
    name: 'collectionID',
    description: 'ID of the collection',
  })
  @IsString()
  @IsNotEmpty()
  collectionID: string;
}

@ArgsType()
export class UpdateTeamCollectionOrderArgs {
  @Field(() => ID, {
    name: 'collectionID',
    description: 'ID of the collection',
  })
  @IsString()
  @IsNotEmpty()
  collectionID: string;

  @Field(() => ID, {
    name: 'destCollID',
    description:
      'ID of the collection that comes after the updated collection in its new position',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  destCollID: string;
}

@ArgsType()
export class UpdateTeamCollectionArgs {
  @Field(() => ID, {
    name: 'collectionID',
    description: 'ID of the collection',
  })
  @IsString()
  @IsNotEmpty()
  collectionID: string;

  @Field({
    name: 'newTitle',
    description: 'The updated title of the collection',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  newTitle: string;

  @Field({
    name: 'data',
    description: 'JSON string representing the collection data',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  data: string;
}
