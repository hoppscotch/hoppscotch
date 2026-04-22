import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ReqType } from 'src/types/RequestTypes';

@ObjectType()
export class TeamCollection {
  @Field(() => ID, {
    description: 'ID of the collection',
  })
  id: string;

  @Field({
    description: 'Displayed title of the collection',
  })
  title: string;

  @Field({
    description: 'JSON string representing the collection data',
    nullable: true,
  })
  data: string;

  @Field(() => ID, {
    description: 'ID of the collection',
    nullable: true,
  })
  parentID: string;

  @Field(() => ReqType, {
    description: 'Type of the user collection',
  })
  type: ReqType;
}

@ObjectType()
export class CollectionReorderData {
  @Field(() => TeamCollection, {
    description: 'Team Collection being moved',
  })
  collection: TeamCollection;

  @Field(() => TeamCollection, {
    description:
      'Team Collection succeeding the collection being moved in its new position',
    nullable: true,
  })
  nextCollection?: TeamCollection;
}


