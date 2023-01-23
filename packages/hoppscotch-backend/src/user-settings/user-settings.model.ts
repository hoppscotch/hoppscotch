import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserSettings {
  @Field(() => ID, {
    description: 'ID of the User Setting',
  })
  id: string;

  @Field(() => ID, {
    description: 'ID of the user this setting belongs to',
  })
  userUid: string;

  @Field({
    description: 'Stringified JSON settings object',
  })
  properties: string; // JSON string of the userSettings object (format:[{ key: "background", value: "system" }, ...] ) which will be received from the client

  @Field({
    description: 'Last updated on',
  })
  updatedOn: Date;
}
