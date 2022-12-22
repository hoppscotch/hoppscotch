import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateUserInput {
  @Field({
    nullable: true,
    name: 'currentRESTSession',
    description: 'JSON string of the session',
  })
  currentRESTSession?: string;

  @Field({
    nullable: true,
    name: 'currentGQLSession',
    description: 'JSON string of the session',
  })
  currentGQLSession?: string;
}
