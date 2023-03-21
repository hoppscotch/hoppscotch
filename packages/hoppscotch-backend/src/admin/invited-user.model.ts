import { ObjectType, ID, Field } from '@nestjs/graphql';

@ObjectType()
export class InvitedUser {
  @Field(() => ID, {
    description: 'Admin UID',
  })
  adminUid: string;

  @Field({
    description: 'Admin email',
  })
  adminEmail: string;

  @Field({
    description: 'Invitee email',
  })
  inviteeEmail: string;

  @Field({
    description: 'Date when the user invitation was sent',
  })
  invitedOn: Date;
}
