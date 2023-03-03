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

registerEnumType(ReqType, {
  name: 'CollType',
});
