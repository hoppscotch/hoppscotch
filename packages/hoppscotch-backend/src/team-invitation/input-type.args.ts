import { ArgsType, Field, ID } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TeamAccessRole } from 'src/team/team.model';

@ArgsType()
export class CreateTeamInvitationArgs {
  @Field(() => ID, {
    name: 'teamID',
    description: 'ID of the Team ID to invite from',
  })
  @IsString()
  @IsNotEmpty()
  teamID: string;

  @Field({ name: 'inviteeEmail', description: 'Email of the user to invite' })
  @IsEmail()
  inviteeEmail: string;

  @Field(() => TeamAccessRole, {
    name: 'inviteeRole',
    description: 'Role to be given to the user',
  })
  @IsEnum(TeamAccessRole)
  inviteeRole: TeamAccessRole;
}
