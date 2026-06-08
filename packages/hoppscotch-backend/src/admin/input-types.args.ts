import { Field, ID, ArgsType } from '@nestjs/graphql';
import { TeamAccessRole } from '../team/team.model';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OffsetPaginationArgs } from 'src/types/input-types.args';

@ArgsType()
export class FetchAllUsersV2Args extends OffsetPaginationArgs {
  @Field({
    name: 'searchString',
    nullable: true,
    description: 'Search on users displayName or email',
  })
  @IsString()
  @IsOptional()
  searchString: string;
}

@ArgsType()
export class FetchAllTeamsV2Args extends OffsetPaginationArgs {
  @Field({
    name: 'searchString',
    nullable: true,
    description: 'Search on team name or ID',
  })
  @IsString()
  @IsOptional()
  searchString: string;
}

@ArgsType()
export class ChangeUserRoleInTeamArgs {
  @IsString()
  @IsNotEmpty()
  @Field(() => ID, {
    name: 'userUID',
    description: 'users UID',
  })
  userUID: string;

  @IsString()
  @IsNotEmpty()
  @Field(() => ID, {
    name: 'teamID',
    description: 'team ID',
  })
  teamID: string;

  @IsEnum(TeamAccessRole)
  @Field(() => TeamAccessRole, {
    name: 'newRole',
    description: 'updated team role',
  })
  newRole: TeamAccessRole;
}

@ArgsType()
export class AddUserToTeamArgs {
  @IsString()
  @IsNotEmpty()
  @Field(() => ID, {
    name: 'teamID',
    description: 'team ID',
  })
  teamID: string;

  @IsEnum(TeamAccessRole)
  @Field(() => TeamAccessRole, {
    name: 'role',
    description: 'The role of the user to add in the team',
  })
  role: TeamAccessRole;

  @IsString()
  @IsNotEmpty()
  @Field({
    name: 'userEmail',
    description: 'Email of the user to add to team',
  })
  userEmail: string;
}
