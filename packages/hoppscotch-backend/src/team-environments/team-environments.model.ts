import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TeamEnvironment {
  @Field(() => ID, {
    description: 'ID of the Team Environment',
  })
  id: string;

  @Field(() => ID, {
    description: 'ID of the team this environment belongs to',
  })
  teamID: string;

  @Field({
    description: 'Name of the environment',
  })
  name: string;

  @Field({
    description: 'All variables present in the environment',
  })
  variables: string; // JSON string of the variables object (format:[{ key: "bla", value: "bla_val" }, ...] ) which will be received from the client
}
