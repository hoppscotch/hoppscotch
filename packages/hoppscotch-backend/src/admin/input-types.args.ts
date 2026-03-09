import { Field, ID, ArgsType } from '@nestjs/graphql';
import { TeamAccessRole } from '../team/team.model';

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

  @Field(() => TeamAccessRole, {
    name: 'newRole',
    description: 'updated team role',
  })
  newRole: TeamAccessRole;
}

@ArgsType()
export class AddUserToTeamArgs {
  @Field(() => ID, {
    name: 'teamID',
    description: 'team ID',
  })
  teamID: string;

  @Field(() => TeamAccessRole, {
    name: 'role',
    description: 'The role of the user to add in the team',
  })
  role: TeamAccessRole;

  @Field({
    name: 'userEmail',
    description: 'Email of the user to add to team',
  })
  userEmail: string;
}
