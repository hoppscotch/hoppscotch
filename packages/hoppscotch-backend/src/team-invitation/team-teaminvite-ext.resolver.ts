import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlTeamResourceGuard } from 'src/team/guards/gql-team-resource.guard';
import { Team } from 'src/team/team.model';
import { TeamInvitation } from './team-invitation.model';
import { TeamInvitationService } from './team-invitation.service';

@Resolver(() => Team)
export class TeamTeamInviteExtResolver {
  constructor(private readonly teamInviteService: TeamInvitationService) {}

  @ResolveField(() => [TeamInvitation], {
    description: 'Get all the active invites in the team',
    complexity: 10,
  })
  @UseGuards(GqlAuthGuard, GqlTeamResourceGuard)
  teamInvitations(@Parent() team: Team): Promise<TeamInvitation[]> {
    return this.teamInviteService.getTeamInvitations(team.id);
  }
}
