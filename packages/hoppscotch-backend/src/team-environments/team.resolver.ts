import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Team } from 'src/team/team.model';
import { TeamEnvironment } from './team-environments.model';
import { TeamEnvironmentsService } from './team-environments.service';

@Resolver(() => Team)
export class TeamEnvsTeamResolver {
  constructor(private teamEnvironmentService: TeamEnvironmentsService) {}

  @ResolveField(() => [TeamEnvironment], {
    description: 'Returns all Team Environments for the given Team',
  })
  teamEnvironments(@Parent() team: Team): Promise<TeamEnvironment[]> {
    return this.teamEnvironmentService.fetchAllTeamEnvironments(team.id);
  }
}
