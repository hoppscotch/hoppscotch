import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { User } from '../user/user.model';
import { UserHistoryService } from './user-history.service';
import { ReqType, UserHistory } from './user-history.model';

@Resolver(() => User)
export class UserHistoryUserResolver {
  constructor(private userHistoryService: UserHistoryService) {}
  @ResolveField(() => [UserHistory], {
    description: 'Returns a users REST history',
  })
  async RESTHistory(@Parent() user: User): Promise<UserHistory[]> {
    return await this.userHistoryService.fetchUserHistory(
      user.uid,
      ReqType.REST,
    );
  }
  @ResolveField(() => [UserHistory], {
    description: 'Returns a users GraphQL history',
  })
  async GraphQLHistory(@Parent() user: User): Promise<UserHistory[]> {
    return await this.userHistoryService.fetchUserHistory(
      user.uid,
      ReqType.GQL,
    );
  }
}
