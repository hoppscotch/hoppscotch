import {
  Resolver,
  ResolveField,
  Parent,
  Args,
  Query,
  Mutation,
  Subscription,
  ID,
} from '@nestjs/graphql';
import {
  TeamRequest,
  CreateTeamRequestInput,
  UpdateTeamRequestInput,
} from './team-request.model';
import { Team, TeamMemberRole } from '../team/team.model';
import { TeamRequestService } from './team-request.service';
import { TeamCollection } from '../team-collection/team-collection.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlRequestTeamMemberGuard } from './guards/gql-request-team-member.guard';
import { GqlCollectionTeamMemberGuard } from '../team-collection/guards/gql-collection-team-member.guard';
import { RequiresTeamRole } from '../team/decorators/requires-team-role.decorator';
import { GqlTeamMemberGuard } from '../team/guards/gql-team-member.guard';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { throwErr } from 'src/utils';

@Resolver(() => TeamRequest)
export class TeamRequestResolver {
  constructor(
    private readonly teamRequestService: TeamRequestService,
    private readonly pubsub: PubSubService,
  ) {}

  // Field resolvers
  @ResolveField(() => Team, {
    description: 'Team the request belongs to',
    complexity: 3,
  })
  team(@Parent() req: TeamRequest): Promise<Team> {
    return this.teamRequestService.getTeamOfRequest(req);
  }

  @ResolveField(() => TeamCollection, {
    description: 'Collection the request belongs to',
    complexity: 3,
  })
  collection(@Parent() req: TeamRequest): Promise<TeamCollection> {
    return this.teamRequestService.getCollectionOfRequest(req);
  }

  // Query
  @Query(() => [TeamRequest], {
    description: 'Search the team for a specific request with title',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  searchForRequest(
    @Args({
      name: 'teamID',
      description: 'ID of the team to look in',
      type: () => ID,
    })
    teamID: string,
    @Args({ name: 'searchTerm', description: 'The title to search for' })
    searchTerm: string,
    @Args({
      name: 'cursor',
      type: () => ID,
      description: 'ID of the last returned request or null',
      nullable: true,
    })
    cursor?: string,
  ): Promise<TeamRequest[]> {
    return this.teamRequestService.searchRequest(
      teamID,
      searchTerm,
      cursor ?? null,
    );
  }

  @Query(() => TeamRequest, {
    description: 'Gives a request with the given ID or null (if not exists)',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard, GqlRequestTeamMemberGuard)
  request(
    @Args({
      name: 'requestID',
      description: 'ID of the request',
      type: () => ID,
    })
    requestID: string,
  ): Promise<TeamRequest | null> {
    return this.teamRequestService.getRequest(requestID);
  }

  @Query(() => [TeamRequest], {
    description: 'Gives a list of requests in the collection',
  })
  @UseGuards(GqlAuthGuard, GqlCollectionTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
    TeamMemberRole.VIEWER,
  )
  requestsInCollection(
    @Args({
      name: 'collectionID',
      description: 'ID of the collection',
      type: () => ID,
    })
    collectionID: string,
    @Args({
      name: 'cursor',
      nullable: true,
      type: () => ID,
      description: 'ID of the last returned request (for pagination)',
    })
    cursor?: string,
  ): Promise<TeamRequest[]> {
    return this.teamRequestService.getRequestsInCollection(
      collectionID,
      cursor ?? null,
    );
  }

  // Mutation
  @Mutation(() => TeamRequest, {
    description: 'Create a request in the given collection.',
  })
  @UseGuards(GqlAuthGuard, GqlCollectionTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.EDITOR, TeamMemberRole.OWNER)
  createRequestInCollection(
    @Args({
      name: 'collectionID',
      description: 'ID of the collection',
      type: () => ID,
    })
    collectionID: string,
    @Args({
      name: 'data',
      type: () => CreateTeamRequestInput,
      description:
        'The request data (stringified JSON of Hoppscotch request object)',
    })
    data: CreateTeamRequestInput,
  ): Promise<TeamRequest> {
    return this.teamRequestService.createTeamRequest(collectionID, data);
  }

  @Mutation(() => TeamRequest, {
    description: 'Update a request with the given ID',
  })
  @UseGuards(GqlAuthGuard, GqlRequestTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.EDITOR, TeamMemberRole.OWNER)
  updateRequest(
    @Args({
      name: 'requestID',
      description: 'ID of the request',
      type: () => ID,
    })
    requestID: string,
    @Args({
      name: 'data',
      type: () => UpdateTeamRequestInput,
      description:
        'The updated request data (stringified JSON of Hoppscotch request object)',
    })
    data: UpdateTeamRequestInput,
  ): Promise<TeamRequest> {
    return this.teamRequestService.updateTeamRequest(requestID, data);
  }

  @Mutation(() => Boolean, {
    description: 'Delete a request with the given ID',
  })
  @UseGuards(GqlAuthGuard, GqlRequestTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.EDITOR, TeamMemberRole.OWNER)
  async deleteRequest(
    @Args({
      name: 'requestID',
      description: 'ID of the request',
      type: () => ID,
    })
    requestID: string,
  ): Promise<boolean> {
    await this.teamRequestService.deleteTeamRequest(requestID);
    return true;
  }

  @Mutation(() => TeamRequest, {
    description: 'Move a request to the given collection',
  })
  @UseGuards(GqlAuthGuard, GqlRequestTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.EDITOR, TeamMemberRole.OWNER)
  moveRequest(
    @Args({
      name: 'requestID',
      description: 'ID of the request to move',
      type: () => ID,
    })
    requestID: string,
    @Args({
      name: 'destCollID',
      description: 'ID of the collection to move the request to',
      type: () => ID,
    })
    destCollID: string,
  ): Promise<TeamRequest> {
    return pipe(
      this.teamRequestService.moveRequest(requestID, destCollID),
      TE.getOrElse((e) => throwErr(e)),
    )();
  }

  // Subscriptions
  @Subscription(() => TeamRequest, {
    description: 'Emits when a new request is added to a team',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.VIEWER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
  )
  teamRequestAdded(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ): AsyncIterator<TeamRequest> {
    return this.pubsub.asyncIterator(`team_req/${teamID}/req_created`);
  }

  @Subscription(() => TeamRequest, {
    description: 'Emitted when a request has been updated',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.VIEWER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
  )
  teamRequestUpdated(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ): AsyncIterator<TeamRequest> {
    return this.pubsub.asyncIterator(`team_req/${teamID}/req_updated`);
  }

  @Subscription(() => ID, {
    description:
      'Emitted when a request has been deleted. Only the id of the request is emitted.',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.VIEWER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
  )
  teamRequestDeleted(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ): AsyncIterator<string> {
    return this.pubsub.asyncIterator(`team_req/${teamID}/req_deleted`);
  }
}
