import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateTeamRequestInput {
  @Field(() => ID, {
    description: 'ID of the team the collection belongs to',
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

@InputType()
export class UpdateTeamRequestInput {
  @Field({
    description: 'JSON string representing the request data',
    nullable: true,
  })
  request?: string;

  @Field({
    description: 'Displayed title of the request',
    nullable: true,
  })
  title?: string;
}

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
