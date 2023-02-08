import { ObjectType, Field, ID } from '@nestjs/graphql';

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

  parentID: string | null;
  teamID: string;
}
