import { Resolver, Query } from '@nestjs/graphql';
import { User } from './user.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';

@Resolver(() => User)
export class UserResolver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  // Query
  // @Query(() => User, {
  //   nullable: true,
  //   description: 'Finds a user by their UID or null if no match',
  //   deprecationReason:
  //     'Deprecated due to privacy concerns. Try to get the user from the context-relevant queries',
  // })
  // async user(@Args({ name: 'uid', type: () => ID }) uid: string): Promise<User | null> {
  //   return this.userService.getUserForUID(uid);
  // }

  @Query(() => User, {
    description:
      "Gives details of the user executing this query (pass Authorization 'Bearer' header)",
  })
  @UseGuards(GqlAuthGuard)
  me(@GqlUser() user: User): User {
    return user;
  }

  //   // Mutation
  //   @Mutation(() => Boolean, {
  //     description: 'Delete an user account',
  //   })
  //   @UseGuards(GqlAuthGuard)
  //   deleteUser(
  //     @GqlUser() user:User
  //   ): Promise<boolean> {
  //     return pipe(
  //       this.userService.deleteUserByUID(user),
  //       TE.map(() => true),
  //       TE.mapLeft((message) => message.toString()),
  //       TE.getOrElse(throwErr)
  //     )();
  //   }
  //
  //   // Subscription
  //   @Subscription(() => User, {
  //     description: 'Listen for user deletion',
  //     resolve: (value) => value,
  //   })
  //   @UseGuards(GqlAuthGuard)
  //   userDeleted(@GqlUser() user: User): AsyncIterator<User> {
  //     return this.pubsub.asyncIterator(`user/${user.uid}/deleted`);
  //   }
}
