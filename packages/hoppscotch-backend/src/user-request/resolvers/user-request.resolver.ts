import { UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PubSubService } from 'src/pubsub/pubsub.service';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';
import { UserRequest, UserRequestReorderData } from '../user-request.model';
import { UserRequestService } from '../user-request.service';
import {
  GetUserRequestArgs,
  CreateUserRequestArgs,
  UpdateUserRequestArgs,
  MoveUserRequestArgs,
} from '../input-type.args';
import { AuthUser } from 'src/types/AuthUser';
import { User } from 'src/user/user.model';
import { ReqType } from 'src/types/RequestTypes';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => UserRequest)
export class UserRequestResolver {
  constructor(
    private readonly userRequestService: UserRequestService,
    private readonly pubSub: PubSubService,
  ) {}

  @ResolveField(() => User, {
    description: 'Returns the user of the user request',
  })
  async user(@GqlUser() user: AuthUser) {
    return user;
  }

  /* Queries */

  @Query(() => [UserRequest], {
    description: 'Get REST user requests',
  })
  @UseGuards(GqlAuthGuard)
  async userRESTRequests(
    @GqlUser() user: AuthUser,
    @Args() args: GetUserRequestArgs,
  ): Promise<UserRequest[]> {
    const requests = await this.userRequestService.fetchUserRequests(
      args.collectionID,
      ReqType.REST,
      args.cursor,
      args.take,
      user,
    );
    if (E.isLeft(requests)) throwErr(requests.left);
    return requests.right;
  }

  @Query(() => [UserRequest], {
    description: 'Get GraphQL user requests',
  })
  @UseGuards(GqlAuthGuard)
  async userGQLRequests(
    @GqlUser() user: AuthUser,
    @Args() args: GetUserRequestArgs,
  ): Promise<UserRequest[]> {
    const requests = await this.userRequestService.fetchUserRequests(
      args.collectionID,
      ReqType.GQL,
      args.cursor,
      args.take,
      user,
    );
    if (E.isLeft(requests)) throwErr(requests.left);
    return requests.right;
  }

  @Query(() => UserRequest, {
    description: 'Get a user request by ID',
  })
  @UseGuards(GqlAuthGuard)
  async userRequest(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'id',
      type: () => ID,
      description: 'ID of the user request',
    })
    id: string,
  ): Promise<UserRequest> {
    const request = await this.userRequestService.fetchUserRequest(id, user);
    if (E.isLeft(request)) throwErr(request.left);
    return request.right;
  }

  /* Mutations */

  @Mutation(() => UserRequest, {
    description: 'Create a new user REST request',
  })
  @UseGuards(GqlAuthGuard)
  async createRESTUserRequest(
    @GqlUser() user: AuthUser,
    @Args() args: CreateUserRequestArgs,
  ) {
    const request = await this.userRequestService.createRequest(
      args.collectionID,
      args.title,
      args.request,
      ReqType.REST,
      user,
    );
    if (E.isLeft(request)) throwErr(request.left);
    return request.right;
  }

  @Mutation(() => UserRequest, {
    description: 'Create a new user GraphQL request',
  })
  @UseGuards(GqlAuthGuard)
  async createGQLUserRequest(
    @GqlUser() user: AuthUser,
    @Args() args: CreateUserRequestArgs,
  ) {
    const request = await this.userRequestService.createRequest(
      args.collectionID,
      args.title,
      args.request,
      ReqType.GQL,
      user,
    );
    if (E.isLeft(request)) throwErr(request.left);
    return request.right;
  }

  @Mutation(() => UserRequest, {
    description: 'Update a user REST request',
  })
  @UseGuards(GqlAuthGuard)
  async updateRESTUserRequest(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'id',
      description: 'ID of the user REST request',
      type: () => ID,
    })
    id: string,
    @Args() args: UpdateUserRequestArgs,
  ) {
    const request = await this.userRequestService.updateRequest(
      id,
      args.title,
      ReqType.REST,
      args.request,
      user,
    );
    if (E.isLeft(request)) throwErr(request.left);
    return request.right;
  }

  @Mutation(() => UserRequest, {
    description: 'Update a user GraphQL request',
  })
  @UseGuards(GqlAuthGuard)
  async updateGQLUserRequest(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'id',
      description: 'ID of the user GraphQL request',
      type: () => ID,
    })
    id: string,
    @Args() args: UpdateUserRequestArgs,
  ) {
    const request = await this.userRequestService.updateRequest(
      id,
      args.title,
      ReqType.GQL,
      args.request,
      user,
    );
    if (E.isLeft(request)) throwErr(request.left);
    return request.right;
  }

  @Mutation(() => Boolean, {
    description: 'Delete a user request',
  })
  @UseGuards(GqlAuthGuard)
  async deleteUserRequest(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'id',
      description: 'ID of the user request',
      type: () => ID,
    })
    id: string,
  ): Promise<boolean> {
    const isDeleted = await this.userRequestService.deleteRequest(id, user);
    if (E.isLeft(isDeleted)) throwErr(isDeleted.left);
    return isDeleted.right;
  }

  @Mutation(() => UserRequest, {
    description:
      'Move and re-order of a user request within same or across collection',
  })
  @UseGuards(GqlAuthGuard)
  async moveUserRequest(
    @GqlUser() user: AuthUser,
    @Args() args: MoveUserRequestArgs,
  ): Promise<UserRequest> {
    const request = await this.userRequestService.moveRequest(
      args.sourceCollectionID,
      args.destinationCollectionID,
      args.requestID,
      args.nextRequestID,
      user,
    );
    if (E.isLeft(request)) throwErr(request.left);
    return request.right;
  }

  /* Subscriptions */

  @Subscription(() => UserRequest, {
    description: 'Listen for User Request Creation',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  userRequestCreated(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_request/${user.uid}/created`);
  }

  @Subscription(() => UserRequest, {
    description: 'Listen for User Request Update',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  userRequestUpdated(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_request/${user.uid}/updated`);
  }

  @Subscription(() => UserRequest, {
    description: 'Listen for User Request Deletion',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  userRequestDeleted(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_request/${user.uid}/deleted`);
  }

  @Subscription(() => UserRequestReorderData, {
    description: 'Listen for User Request Moved',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  userRequestMoved(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_request/${user.uid}/moved`);
  }
}
