import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { GqlTeamResourceGuard } from 'src/team/guards/gql-team-resource.guard';
import { Team } from 'src/team/team.model';
import { AuthUser } from 'src/types/AuthUser';
import { TeamEnvironment } from './team-environments.model';
import { TeamEnvironmentsService } from './team-environments.service';

@Resolver(() => Team)
export class TeamEnvsTeamResolver {
  constructor(
    private teamEnvironmentService: TeamEnvironmentsService,
    private readonly teamResourceGuard: GqlTeamResourceGuard,
  ) {}

  @ResolveField(() => [TeamEnvironment], {
    description: 'Returns all Team Environments for the given Team',
  })
  async teamEnvironments(
    @Parent() team: Team,
    @GqlUser() user: AuthUser,
  ): Promise<TeamEnvironment[]> {
    await this.teamResourceGuard.assertCanRead(user, team.id);
    return this.teamEnvironmentService.fetchAllTeamEnvironments(team.id);
  }
}
