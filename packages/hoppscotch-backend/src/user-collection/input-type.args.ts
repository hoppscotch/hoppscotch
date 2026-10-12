import { Field, ID, ArgsType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReqType } from 'src/types/RequestTypes';
import { PaginationArgs } from 'src/types/input-types.args';

@ArgsType()
export class CreateRootUserCollectionArgs {
  @Field({ name: 'title', description: 'Title of the new user collection' })
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
export class CreateChildUserCollectionArgs {
  @Field({ name: 'title', description: 'Title of the new user collection' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field(() => ID, {
    name: 'parentUserCollectionID',
    description: 'ID of the parent to the new user collection',
  })
  @IsString()
  @IsOptional()
  parentUserCollectionID: string;

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
export class GetUserChildCollectionArgs extends PaginationArgs {
  @Field(() => ID, {
    name: 'userCollectionID',
    description: 'ID of the parent to the user collection',
  })
  @IsString()
  @IsNotEmpty()
  userCollectionID: string;
}

@ArgsType()
export class RenameUserCollectionsArgs {
  @Field(() => ID, {
    name: 'userCollectionID',
    description: 'ID of the user collection',
  })
  @IsString()
  @IsNotEmpty()
  userCollectionID: string;

  @Field({
    name: 'newTitle',
    description: 'The updated title of the user collection',
  })
  @IsString()
  @IsNotEmpty()
  newTitle: string;
}

@ArgsType()
export class UpdateUserCollectionArgs {
  @Field(() => ID, {
    name: 'collectionID',
    description: 'ID of collection being moved',
  })
  @IsString()
  @IsNotEmpty()
  collectionID: string;

  @Field(() => ID, {
    name: 'nextCollectionID',
    nullable: true,
    description: 'ID of collection being moved',
  })
  @IsString()
  @IsOptional()
  nextCollectionID: string;
}

@ArgsType()
export class MoveUserCollectionArgs {
  @Field(() => ID, {
    name: 'destCollectionID',
    description: 'ID of the parent to the new collection',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  destCollectionID: string;

  @Field(() => ID, {
    name: 'userCollectionID',
    description: 'ID of the collection',
  })
  @IsString()
  @IsNotEmpty()
  userCollectionID: string;
}

@ArgsType()
export class ImportUserCollectionsFromJSONArgs {
  @Field({
    name: 'jsonString',
    description: 'JSON string to import',
  })
  @IsString()
  @IsNotEmpty()
  jsonString: string;

  @Field(() => ReqType, {
    name: 'reqType',
    description: 'Type of UserCollection',
  })
  @IsEnum(ReqType)
  reqType: ReqType;

  @Field(() => ID, {
    name: 'parentCollectionID',
    description:
      'ID to the collection to which to import into (null if to import into the root of the user)',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  parentCollectionID?: string;
}

@ArgsType()
export class UpdateUserCollectionsArgs {
  @Field(() => ID, {
    name: 'userCollectionID',
    description: 'ID of the user collection',
  })
  @IsString()
  @IsNotEmpty()
  userCollectionID: string;

  @Field({
    name: 'newTitle',
    description: 'The updated title of the user collection',
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
