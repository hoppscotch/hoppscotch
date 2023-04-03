import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { SessionType, User } from './user.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';
import { UserService } from './user.service';
import { throwErr } from 'src/utils';
import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { AuthUser } from 'src/types/AuthUser';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly pubsub: PubSubService,
  ) {}

  @Query(() => User, {
    description:
      "Gives details of the user executing this query (pass Authorization 'Bearer' header)",
  })
  @UseGuards(GqlAuthGuard)
  me(@GqlUser() user: AuthUser) {
    return this.userService.convertDbUserToUser(user);
  }

  /* Mutations */

  @Mutation(() => User, {
    description: 'Update user sessions',
  })
  @UseGuards(GqlAuthGuard)
  async updateUserSessions(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'currentSession',
      description: 'JSON string of the saved REST/GQL session',
    })
    currentSession: string,
    @Args({
      name: 'sessionType',
      description: 'Type of the session',
      type: () => SessionType,
    })
    sessionType: SessionType,
  ): Promise<User> {
    const updatedUser = await this.userService.updateUserSessions(
      user,
      currentSession,
      sessionType,
    );
    if (E.isLeft(updatedUser)) throwErr(updatedUser.left);
    return updatedUser.right;
  }
  @Mutation(() => Boolean, {
    description: 'Delete an user account',
  })
  @UseGuards(GqlAuthGuard)
  deleteUser(@GqlUser() user: AuthUser): Promise<boolean> {
    return pipe(
      this.userService.deleteUserByUID(user),
      TE.map(() => true),
      TE.mapLeft((message) => message.toString()),
      TE.getOrElse(throwErr),
    )();
  }

  /* Subscriptions */

  @Subscription(() => User, {
    description: 'Listen for user updates',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  userUpdated(@GqlUser() user: User) {
    return this.pubsub.asyncIterator(`user/${user.uid}/updated`);
  }

  @Subscription(() => User, {
    description: 'Listen for user deletion',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userDeleted(@GqlUser() user: User): AsyncIterator<User> {
    return this.pubsub.asyncIterator(`user/${user.uid}/deleted`);
  }
}
