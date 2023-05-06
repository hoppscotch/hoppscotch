import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { TeamMember } from './team.model';
import { UserService } from 'src/user/user.service';
import { User } from '../user/user.model';
import { throwErr } from 'src/utils';
import { USER_NOT_FOUND } from 'src/errors';
import * as O from 'fp-ts/Option';

@Resolver(() => TeamMember)
export class TeamMemberResolver {
  constructor(private readonly userService: UserService) {}

  @ResolveField(() => User)
  async user(@Parent() teamMember: TeamMember): Promise<User> {
    const member = await this.userService.findUserById(teamMember.userUid);
    if (O.isNone(member)) throwErr(USER_NOT_FOUND);

    return {
      ...member.value,
      currentRESTSession: JSON.stringify(member.value.currentRESTSession),
      currentGQLSession: JSON.stringify(member.value.currentGQLSession),
    };
  }
}
