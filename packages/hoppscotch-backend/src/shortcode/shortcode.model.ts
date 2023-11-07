import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Shortcode {
  @Field(() => ID, {
    description: 'The 12 digit alphanumeric code',
  })
  id: string;

  @Field({
    description: 'JSON string representing the request data',
  })
  request: string;

  @Field({
    description: 'JSON string representing the properties for an embed',
    nullable: true,
  })
  properties: string;

  @Field({
    description: 'Timestamp of when the Shortcode was created',
  })
  createdOn: Date;
}
