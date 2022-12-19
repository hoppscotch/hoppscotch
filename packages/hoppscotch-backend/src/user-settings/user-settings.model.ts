import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserSettings {
  @Field(() => ID, {
    description: 'ID of the User Settings',
  })
  id: string;

  @Field(() => ID, {
    description: 'ID of the user this settings belongs to',
  })
  userUid: string;

  @Field({
    description: 'All properties present in the settings',
  })
  properties: string; // JSON string of the properties object (format:[{ key: "background", value: "system" }, ...] ) which will be received from the client

  @Field({
    description: 'Last updated date-time of the settings',
  })
  updatedOn: Date;
}
