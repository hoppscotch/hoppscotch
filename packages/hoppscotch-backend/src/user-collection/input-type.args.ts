import { Field, ID, ArgsType } from '@nestjs/graphql';
import { ReqType } from 'src/types/RequestTypes';
import { PaginationArgs } from 'src/types/input-types.args';

@ArgsType()
export class CreateRootUserCollectionArgs {
  @Field({ name: 'title', description: 'Title of the new user collection' })
  title: string;

  @Field({
    name: 'data',
    description: 'JSON string representing the collection data',
    nullable: true,
  })
  data: string;
}
@ArgsType()
export class CreateChildUserCollectionArgs {
  @Field({ name: 'title', description: 'Title of the new user collection' })
  title: string;

  @Field(() => ID, {
    name: 'parentUserCollectionID',
    description: 'ID of the parent to the new user collection',
  })
  parentUserCollectionID: string;

  @Field({
    name: 'data',
    description: 'JSON string representing the collection data',
    nullable: true,
  })
  data: string;
}

@ArgsType()
export class GetUserChildCollectionArgs extends PaginationArgs {
  @Field(() => ID, {
    name: 'userCollectionID',
    description: 'ID of the parent to the user collection',
  })
  userCollectionID: string;
}

@ArgsType()
export class RenameUserCollectionsArgs {
  @Field(() => ID, {
    name: 'userCollectionID',
    description: 'ID of the user collection',
  })
  userCollectionID: string;

  @Field({
    name: 'newTitle',
    description: 'The updated title of the user collection',
  })
  newTitle: string;
}

@ArgsType()
export class UpdateUserCollectionArgs {
  @Field(() => ID, {
    name: 'collectionID',
    description: 'ID of collection being moved',
  })
  collectionID: string;

  @Field(() => ID, {
    name: 'nextCollectionID',
    nullable: true,
    description: 'ID of collection being moved',
  })
  nextCollectionID: string;
}

@ArgsType()
export class MoveUserCollectionArgs {
  @Field(() => ID, {
    name: 'destCollectionID',
    description: 'ID of the parent to the new collection',
    nullable: true,
  })
  destCollectionID: string;

  @Field(() => ID, {
    name: 'userCollectionID',
    description: 'ID of the collection',
  })
  userCollectionID: string;
}

@ArgsType()
export class ImportUserCollectionsFromJSONArgs {
  @Field({
    name: 'jsonString',
    description: 'JSON string to import',
  })
  jsonString: string;
  @Field(() => ReqType, {
    name: 'reqType',
    description: 'Type of UserCollection',
  })
  reqType: ReqType;
  @Field(() => ID, {
    name: 'parentCollectionID',
    description:
      'ID to the collection to which to import into (null if to import into the root of the user)',
    nullable: true,
  })
  parentCollectionID?: string;
}

@ArgsType()
export class UpdateUserCollectionsArgs {
  @Field(() => ID, {
    name: 'userCollectionID',
    description: 'ID of the user collection',
  })
  userCollectionID: string;

  @Field({
    name: 'newTitle',
    description: 'The updated title of the user collection',
    nullable: true,
  })
  newTitle: string;

  @Field({
    name: 'data',
    description: 'JSON string representing the collection data',
    nullable: true,
  })
  data: string;
}
