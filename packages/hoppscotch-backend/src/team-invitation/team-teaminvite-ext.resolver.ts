import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { GqlTeamResourceGuard } from 'src/team/guards/gql-team-resource.guard';
import { Team } from 'src/team/team.model';
import { AuthUser } from 'src/types/AuthUser';
import { TeamInvitation } from './team-invitation.model';
import { TeamInvitationService } from './team-invitation.service';

@Resolver(() => Team)
export class TeamTeamInviteExtResolver {
  constructor(
    private readonly teamInviteService: TeamInvitationService,
    private readonly teamResourceGuard: GqlTeamResourceGuard,
  ) {}

  @ResolveField(() => [TeamInvitation], {
    description: 'Get all the active invites in the team',
    complexity: 10,
  })
  async teamInvitations(
    @Parent() team: Team,
    @GqlUser() user: AuthUser,
  ): Promise<TeamInvitation[]> {
    await this.teamResourceGuard.assertCanRead(user, team.id);
    return this.teamInviteService.getTeamInvitations(team.id);
  }
}
