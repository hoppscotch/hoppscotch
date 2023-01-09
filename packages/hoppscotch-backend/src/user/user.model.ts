import { ObjectType, ID, Field } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID, {
    description: 'ID of the user',
  })
  id: string;

  @Field({
    nullable: true,
    description: 'Name of the user (if fetched)',
  })
  name?: string;

  @Field({
    nullable: true,
    description: 'Email of the user (if fetched)',
  })
  email?: string;

  @Field({
    nullable: true,
    description: 'URL to the profile photo of the user (if fetched)',
  })
  image?: string;

  @Field({
    nullable: true,
    description: 'Flag to determine if user is an Admin or not',
  })
  isAdmin?: string;

  @Field({
    nullable: true,
    description: 'Date when the user account was created',
  })
  createdOn?: string;
}
