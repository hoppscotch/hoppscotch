import {
  ObjectType,
  ID,
  Field,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';

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

export enum SessionType {
  REST = 'REST',
  GQL = 'GQL',
}

registerEnumType(SessionType, {
  name: 'SessionType',
});
