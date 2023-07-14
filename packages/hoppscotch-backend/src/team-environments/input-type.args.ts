import { ArgsType, Field, ID } from '@nestjs/graphql';

@ArgsType()
export class CreateTeamEnvironmentArgs {
  @Field({
    name: 'name',
    description: 'Name of the Team Environment',
  })
  name: string;

  @Field(() => ID, {
    name: 'teamID',
    description: 'ID of the Team',
  })
  teamID: string;

  @Field({
    name: 'variables',
    description: 'JSON string of the variables object',
  })
  variables: string;
}

@ArgsType()
export class UpdateTeamEnvironmentArgs {
  @Field(() => ID, {
    name: 'id',
    description: 'ID of the Team Environment',
  })
  id: string;
  @Field({
    name: 'name',
    description: 'Name of the Team Environment',
  })
  name: string;
  @Field({
    name: 'variables',
    description: 'JSON string of the variables object',
  })
  variables: string;
}
