import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { UpdateUserInput, User } from './user.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';
import { UserService } from './user.service';
import { throwErr } from 'src/utils';
import * as E from 'fp-ts/lib/Either';
import { PubSubService } from 'src/pubsub/pubsub.service';

@Resolver(() => User)
export class UserResolver {
  // TODO: remove the eslint-disable line below once dependencies are added to user.service file
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(
    private readonly userService: UserService,
    private readonly pubsub: PubSubService,
  ) {}

  @Query(() => User, {
    description:
      "Gives details of the user executing this query (pass Authorization 'Bearer' header)",
  })
  @UseGuards(GqlAuthGuard)
  me(@GqlUser() user: User): User {
    return user;
  }

  @Query(() => User, {
    description:
      "Gives details of the user executing this query (pass Authorization 'Bearer' header)",
  })
  @UseGuards(GqlAuthGuard)
  me2(@GqlUser() user: User): User {
    return user;
  }

  /* Mutations */

  @Mutation(() => User, {
    description: 'Update user information',
  })
  @UseGuards(GqlAuthGuard)
  async updateUser(
    @GqlUser() user: User,
    @Args('args') userInput: UpdateUserInput,
  ): Promise<User> {
    const updatedUser = await this.userService.updateUser(user, userInput);
    if (E.isLeft(updatedUser)) throwErr(updatedUser.left);
    return updatedUser.right;
  }

  /* Subscriptions */

  @Subscription(() => User, {
    description: 'Listen for user updates',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userUpdated(@GqlUser() user: User) {
    return this.pubsub.asyncIterator(`user/${user.uid}/updated`);
  }
}
