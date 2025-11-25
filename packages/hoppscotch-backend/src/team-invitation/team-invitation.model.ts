import { Field, ID, ObjectType } from '@nestjs/graphql';
import { TeamAccessRole } from '../team/team.model';

@ObjectType()
export class TeamInvitation {
  @Field(() => ID, {
    description: 'ID of the invite',
  })
  id: string;

  @Field(() => ID, {
    description: 'ID of the team the invite is to',
  })
  teamID: string;

  @Field(() => ID, {
    description: 'UID of the creator of the invite',
  })
  creatorUid: string;

  @Field({
    description: 'Email of the invitee',
  })
  inviteeEmail: string;

  @Field(() => TeamAccessRole, {
    description: 'The role that will be given to the invitee',
  })
  inviteeRole: TeamAccessRole;
}
