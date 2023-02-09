import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Shortcode {
  @Field(() => ID, {
    description: 'The shortcode. 12 digit alphanumeric.',
  })
  id: string;

  @Field({
    description: 'JSON string representing the request data',
  })
  request: string;

  @Field({
    description: 'Timestamp of when the Shortcode was created',
  })
  createdOn: Date;
}
