import { ObjectType, ID, Field } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID, {
    description: 'Firebase UID of the user',
  })
  uid: string;

  @Field({
    nullable: true,
    description: 'Displayed name of the user (if given)',
  })
  displayName?: string;

  @Field({
    nullable: true,
    description: 'Email of the user (if given)',
  })
  email?: string;

  @Field({
    nullable: true,
    description: 'URL to the profile photo of the user (if given)',
  })
  photoURL?: string;

  @Field({
    nullable: true,
    description: 'JSON string of current REST session for logged-in User',
  })
  currentRESTSession?: string;

  @Field({
    nullable: true,
    description: 'JSON string of current GraphQL session for logged-in User',
  })
  currentGQLSession?: string;
}
