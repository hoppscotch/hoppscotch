import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { ReqType } from 'src/types/RequestTypes';

@ObjectType()
export class UserCollection {
  @Field(() => ID, {
    description: 'ID of the user collection',
  })
  id: string;

  @Field({
    description: 'Displayed title of the user collection',
  })
  title: string;

  @Field(() => ReqType, {
    description: 'Type of the user collection',
  })
  type: ReqType;

  parentID: string | null;

  userID: string;
}

@ObjectType()
export class UserCollectionReorderData {
  @Field({
    description: 'User Collection being moved',
  })
  userCollection: UserCollection;

  @Field({
    description:
      'User Collection succeeding the collection being moved in its new position',
    nullable: true,
  })
  nextUserCollection?: UserCollection;
}

@ObjectType()
export class UserCollectionRemovedData {
  @Field(() => ID, {
    description: 'ID of User Collection being removed',
  })
  id: string;

  @Field(() => ReqType, {
    description: 'Type of the user collection',
  })
  type: ReqType;
}

registerEnumType(ReqType, {
  name: 'CollType',
});

@ObjectType()
export class UserCollectionExportJSONData {
  @Field(() => ID, {
    description: 'Stringified contents of the collection',
  })
  exportedCollection: string;

  @Field(() => ReqType, {
    description: 'Type of the user collection',
  })
  collectionType: ReqType;
}
