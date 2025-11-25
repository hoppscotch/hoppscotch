import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { User } from '../user/user.model';
import { UserHistoryService } from './user-history.service';
import { UserHistory } from './user-history.model';
import { ReqType } from 'src/types/RequestTypes';
import { PaginationArgs } from '../types/input-types.args';

@Resolver(() => User)
export class UserHistoryUserResolver {
  constructor(private userHistoryService: UserHistoryService) {}

  @ResolveField(() => [UserHistory], {
    description: 'Returns a users REST history',
  })
  async RESTHistory(
    @Parent() user: User,
    @Args() args: PaginationArgs,
  ): Promise<UserHistory[]> {
    return await this.userHistoryService.fetchUserHistory(
      user.uid,
      args.take,
      ReqType.REST,
    );
  }
  @ResolveField(() => [UserHistory], {
    description: 'Returns a users GraphQL history',
  })
  async GQLHistory(
    @Parent() user: User,
    @Args() args: PaginationArgs,
  ): Promise<UserHistory[]> {
    return await this.userHistoryService.fetchUserHistory(
      user.uid,
      args.take,
      ReqType.GQL,
    );
  }
}
