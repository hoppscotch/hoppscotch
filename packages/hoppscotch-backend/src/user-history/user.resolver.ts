import { Args, ResolveField, Resolver } from '@nestjs/graphql';
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
    description: 'Returns the authenticated users REST history',
  })
  @UseGuards(GqlAuthGuard)
  async RESTHistory(
    @GqlUser() user: User,
    @Args() args: PaginationArgs,
  ): Promise<UserHistory[]> {
    return await this.userHistoryService.fetchUserHistory(
      user.uid,
      args.take,
      ReqType.REST,
    );
  }
  @ResolveField(() => [UserHistory], {
    description: 'Returns the authenticated users GraphQL history',
  })
  @UseGuards(GqlAuthGuard)
  async GQLHistory(
    @GqlUser() user: User,
    @Args() args: PaginationArgs,
  ): Promise<UserHistory[]> {
    return await this.userHistoryService.fetchUserHistory(
      user.uid,
      args.take,
      ReqType.GQL,
    );
  }
}
