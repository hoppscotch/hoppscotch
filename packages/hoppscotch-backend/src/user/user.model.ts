import { ObjectType, ID, Field, registerEnumType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID, {
    description: 'UID of the user',
  })
  uid: string;

  @Field({
    nullable: true,
    description: 'Name of the user (if fetched)',
  })
  displayName?: string;

  @Field({
    nullable: true,
    description: 'Email of the user',
  })
  email?: string;

  @Field({
    nullable: true,
    description: 'URL to the profile photo of the user (if fetched)',
  })
  photoURL?: string;

  @Field({
    description: 'Flag to determine if user is an Admin or not',
  })
  isAdmin: boolean;

  @Field({
    description: 'Date when the user account was created',
  })
  createdOn: Date;

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
