import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateUserInput {
  @Field({
    nullable: true,
    name: 'displayName',
    description: 'Displayed name of the user (if given)',
  })
  displayName?: string;

  @Field({
    nullable: true,
    name: 'photoURL',
    description: 'URL to the profile photo of the user (if given)',
  })
  photoURL?: string;

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
