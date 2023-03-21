import { Field, ID, ArgsType } from '@nestjs/graphql';
import { TeamMemberRole } from '../team/team.model';

@ArgsType()
export class ChangeUserRoleInTeamArgs {
  @Field(() => ID, {
    name: 'userUID',
    description: 'users UID',
  })
  userUID: string;
  @Field(() => ID, {
    name: 'teamID',
    description: 'team ID',
  })
  teamID: string;

  @Field(() => TeamMemberRole, {
    name: 'newRole',
    description: 'updated team role',
  })
  newRole: TeamMemberRole;
}
@ArgsType()
export class AddUserToTeamArgs {
  @Field(() => ID, {
    name: 'teamID',
    description: 'team ID',
  })
  teamID: string;

  @Field(() => TeamMemberRole, {
    name: 'role',
    description: 'The role of the user to add in the team',
  })
  role: TeamMemberRole;

  @Field({
    name: 'userEmail',
    description: 'Email of the user to add to team',
  })
  userEmail: string;
}
