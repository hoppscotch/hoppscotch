import { ObjectType, ID, Field, InputType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID, {
    description: 'UID of the user',
  })
  uid: string;

  @Field({
    nullable: true,
    description: 'Displayed name of the user',
  })
  displayName?: string;

  @Field({
    nullable: true,
    description: 'Email of the user',
  })
  email?: string;

  @Field({
    nullable: true,
    description: 'URL to the profile photo of the user',
  })
  photoURL?: string;

  @Field({
    nullable: true,
    description: 'Stringified current REST session for logged-in User',
  })
  currentRESTSession?: string;

  @Field({
    nullable: true,
    description: 'Stringified current GraphQL session for logged-in User',
  })
  currentGQLSession?: string;
}

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
    description: 'JSON string of the saved REST session',
  })
  currentRESTSession?: string;

  @Field({
    nullable: true,
    name: 'currentGQLSession',
    description: 'JSON string of the saved GQL session',
  })
  currentGQLSession?: string;
}
