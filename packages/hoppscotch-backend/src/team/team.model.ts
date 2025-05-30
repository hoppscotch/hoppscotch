import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';

@ObjectType()
export class Team {
  @Field(() => ID, {
    description: 'ID of the team',
  })
  id: string;

  @Field(() => String, {
    description: 'Displayed name of the team',
  })
  name: string;
}

@ObjectType()
export class TeamMember {
  @Field(() => ID, {
    description: 'Membership ID of the Team Member',
  })
  membershipID: string;

  userUid: string;

  @Field(() => TeamAccessRole, {
    description: 'Role of the given team member in the given team',
  })
  role: TeamAccessRole;
}

export enum TeamAccessRole {
  OWNER = 'OWNER',
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
}

registerEnumType(TeamAccessRole, {
  name: 'TeamAccessRole',
});
