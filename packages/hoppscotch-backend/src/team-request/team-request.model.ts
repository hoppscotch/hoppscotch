import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class TeamRequest {
  @Field(() => ID, {
    description: 'ID of the request',
  })
  id: string;

  @Field(() => ID, {
    description: 'ID of the collection the request belongs to.',
  })
  collectionID: string;

  @Field(() => ID, {
    description: 'ID of the team the request belongs to.',
  })
  teamID: string;

  @Field({
    description: 'JSON string representing the request data',
  })
  request: string;

  @Field({
    description: 'Displayed title of the request',
  })
  title: string;
}

@ObjectType()
export class RequestReorderData {
  @Field({
    description: 'Team Request being moved',
  })
  request: TeamRequest;

  @Field({
    description:
      'Team Request succeeding the request being moved in its new position',
    nullable: true,
  })
  nextRequest?: TeamRequest;
}
