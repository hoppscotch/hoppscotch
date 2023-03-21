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
import { RequestReorderData, TeamRequest } from './team-request.model';
import {
  CreateTeamRequestInput,
  UpdateTeamRequestInput,
  SearchTeamRequestArgs,
  GetTeamRequestInCollectionArgs,
  MoveTeamRequestArgs,
  UpdateLookUpRequestOrderArgs,
} from './input-type.args';
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
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { throwErr } from 'src/utils';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@UseGuards(GqlThrottlerGuard)
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
  async team(@Parent() req: TeamRequest) {
    const team = await this.teamRequestService.getTeamOfRequest(req);
    if (E.isLeft(team)) throwErr(team.left);
    return team.right;
  }

  @ResolveField(() => TeamCollection, {
    description: 'Collection the request belongs to',
    complexity: 3,
  })
  async collection(@Parent() req: TeamRequest) {
    const teamCollection = await this.teamRequestService.getCollectionOfRequest(
      req,
    );
    if (E.isLeft(teamCollection)) throwErr(teamCollection.left);
    return teamCollection.right;
  }

  // Query
  @Query(() => [TeamRequest], {
    description: 'Search the team for a specific request with title',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
    TeamMemberRole.VIEWER,
  )
  async searchForRequest(@Args() args: SearchTeamRequestArgs) {
    return this.teamRequestService.searchRequest(
      args.teamID,
      args.searchTerm,
      args.cursor,
      args.take,
    );
  }

  @Query(() => TeamRequest, {
    description: 'Gives a request with the given ID or null (if not exists)',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard, GqlRequestTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
    TeamMemberRole.VIEWER,
  )
  async request(
    @Args({
      name: 'requestID',
      description: 'ID of the request',
      type: () => ID,
    })
    requestID: string,
  ) {
    const teamRequest = await this.teamRequestService.getRequest(requestID);
    if (O.isNone(teamRequest)) return null;
    return teamRequest.value;
  }

  @Query(() => [TeamRequest], {
    description: 'Gives a paginated list of requests in the collection',
  })
  @UseGuards(GqlAuthGuard, GqlCollectionTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
    TeamMemberRole.VIEWER,
  )
  async requestsInCollection(@Args() input: GetTeamRequestInCollectionArgs) {
    return this.teamRequestService.getRequestsInCollection(
      input.collectionID,
      input.cursor,
      input.take,
    );
  }

  // Mutation
  @Mutation(() => TeamRequest, {
    description: 'Create a team request in the given collection.',
  })
  @UseGuards(GqlAuthGuard, GqlCollectionTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.EDITOR, TeamMemberRole.OWNER)
  async createRequestInCollection(
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
  ) {
    const teamRequest = await this.teamRequestService.createTeamRequest(
      collectionID,
      data.teamID,
      data.title,
      data.request,
    );
    if (E.isLeft(teamRequest)) throwErr(teamRequest.left);
    return teamRequest.right;
  }

  @Mutation(() => TeamRequest, {
    description: 'Update a request with the given ID',
  })
  @UseGuards(GqlAuthGuard, GqlRequestTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.EDITOR, TeamMemberRole.OWNER)
  async updateRequest(
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
  ) {
    const teamRequest = await this.teamRequestService.updateTeamRequest(
      requestID,
      data.title,
      data.request,
    );
    if (E.isLeft(teamRequest)) throwErr(teamRequest.left);
    return teamRequest.right;
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
  ) {
    const isDeleted = await this.teamRequestService.deleteTeamRequest(
      requestID,
    );
    if (E.isLeft(isDeleted)) throwErr(isDeleted.left);
    return isDeleted.right;
  }

  @Mutation(() => Boolean, {
    description: 'Update the order of requests in the lookup table',
  })
  @UseGuards(GqlAuthGuard, GqlRequestTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.EDITOR, TeamMemberRole.OWNER)
  async updateLookUpRequestOrder(
    @Args()
    args: UpdateLookUpRequestOrderArgs,
  ) {
    const teamRequest = await this.teamRequestService.moveRequest(
      args.collectionID,
      args.requestID,
      args.collectionID,
      args.nextRequestID,
      'updateLookUpRequestOrder',
    );
    if (E.isLeft(teamRequest)) throwErr(teamRequest.left);
    return true;
  }

  @Mutation(() => TeamRequest, {
    description: 'Move a request to the given collection',
  })
  @UseGuards(GqlAuthGuard, GqlRequestTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.EDITOR, TeamMemberRole.OWNER)
  async moveRequest(@Args() args: MoveTeamRequestArgs) {
    const teamRequest = await this.teamRequestService.moveRequest(
      args.srcCollID,
      args.requestID,
      args.destCollID,
      args.nextRequestID,
      'moveRequest',
    );
    if (E.isLeft(teamRequest)) throwErr(teamRequest.left);
    return teamRequest.right;
  }

  // Subscriptions
  @Subscription(() => TeamRequest, {
    description: 'Emits when a new request is added to a team',
    resolve: (value) => value,
  })
  @SkipThrottle()
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
  ) {
    return this.pubsub.asyncIterator(`team_req/${teamID}/req_created`);
  }

  @Subscription(() => TeamRequest, {
    description: 'Emitted when a request has been updated',
    resolve: (value) => value,
  })
  @SkipThrottle()
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
  ) {
    return this.pubsub.asyncIterator(`team_req/${teamID}/req_updated`);
  }

  @Subscription(() => ID, {
    description:
      'Emitted when a request has been deleted. Only the id of the request is emitted.',
    resolve: (value) => value,
  })
  @SkipThrottle()
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
  ) {
    return this.pubsub.asyncIterator(`team_req/${teamID}/req_deleted`);
  }

  @Subscription(() => RequestReorderData, {
    description:
      'Emitted when a requests position has been changed in its collection',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.VIEWER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
  )
  requestOrderUpdated(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ) {
    return this.pubsub.asyncIterator(`team_req/${teamID}/req_order_updated`);
  }

  @Subscription(() => TeamRequest, {
    description:
      'Emitted when a request has been moved from one collection into another',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.VIEWER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
  )
  requestMoved(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ) {
    return this.pubsub.asyncIterator(`team_req/${teamID}/req_moved`);
  }
}
