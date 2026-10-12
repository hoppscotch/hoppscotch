import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '../user/user.model';
import { UserHistoryService } from './user-history.service';
import { UserHistory } from './user-history.model';
import { ReqType } from 'src/types/RequestTypes';
import { PaginationArgs } from '../types/input-types.args';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';

@Resolver(() => User)
export class UserHistoryUserResolver {
  constructor(private userHistoryService: UserHistoryService) {}

  @ResolveField(() => [UserHistory], {
    description: 'Returns a users REST history',
  })
  @UseGuards(GqlAuthGuard)
  async RESTHistory(
    @Parent() user: User,
    @GqlUser() requestingUser: User,
    @Args() args: PaginationArgs,
  ): Promise<UserHistory[]> {
    if (requestingUser?.uid !== user.uid) return [];
    return await this.userHistoryService.fetchUserHistory(
      user.uid,
      args.take,
      ReqType.REST,
    );
  }
  @ResolveField(() => [UserHistory], {
    description: 'Returns a users GraphQL history',
  })
  @UseGuards(GqlAuthGuard)
  async GQLHistory(
    @Parent() user: User,
    @GqlUser() requestingUser: User,
    @Args() args: PaginationArgs,
  ): Promise<UserHistory[]> {
    if (requestingUser?.uid !== user.uid) return [];
    return await this.userHistoryService.fetchUserHistory(
      user.uid,
      args.take,
      ReqType.GQL,
    );
  }
}
