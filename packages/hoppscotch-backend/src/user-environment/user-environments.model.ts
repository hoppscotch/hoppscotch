import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserEnvironment {
  @Field(() => ID, {
    description: 'ID of the User Environment',
  })
  id: string;

  @Field(() => ID, {
    description: 'ID of the user this environment belongs to',
  })
  userUid: string;

  @Field(() => String, {
    nullable: true,
    description: 'Name of the environment',
  })
  name: string | null | undefined; // types have a union to avoid TS warnings and field is nullable when it is global env

  @Field({
    description: 'All variables present in the environment',
  })
  variables: string; // JSON string of the variables object (format:[{ key: "bla", value: "bla_val" }, ...] ) which will be received from the client

  @Field({
    description: 'Flag to indicate the environment is global or not',
  })
  isGlobal: boolean;
}
