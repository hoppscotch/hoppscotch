import { Resolver, Query } from '@nestjs/graphql';
import { User } from './user.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';

@Resolver(() => User)
export class UserResolver {
  // TODO: remove the eslint-disable line below once dependencies are added to user.service file
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

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
}
