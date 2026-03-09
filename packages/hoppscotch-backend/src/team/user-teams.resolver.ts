import { Resolver, ResolveField, Parent, Args, ID } from '@nestjs/graphql';
import { User } from '../user/user.model';
import { Team } from './team.model';
import { TeamService } from './team.service';

@Resolver(() => User)
export class UserTeamsResolver {
  constructor(private readonly teamService: TeamService) {}

  @ResolveField(() => [Team], {
    description: 'Returns the list of teams the user is a member of',
    complexity: 10,
  })
  async teams(
    @Parent() user: User,
    @Args({
      name: 'cursor',
      type: () => ID,
      description:
        'The ID of the last returned team entry (used for pagination)',
      nullable: true,
    })
    cursor?: string,
  ): Promise<Team[]> {
    return this.teamService.getTeamsOfUser(user.uid, cursor ?? null);
  }
}
