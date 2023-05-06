import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';
import { UserRequestService } from '../user-request.service';
import { UserRequest } from '../user-request.model';
import { AuthUser } from 'src/types/AuthUser';
import { UserCollection } from 'src/user-collection/user-collections.model';
import { PaginationArgs } from 'src/types/input-types.args';

@Resolver(() => UserCollection)
export class UserRequestUserCollectionResolver {
  constructor(private readonly userRequestService: UserRequestService) {}

  @ResolveField(() => [UserRequest], {
    description: 'Returns user requests of a user collection',
  })
  async requests(
    @Parent() user: AuthUser,
    @Parent() collection: UserCollection,
    @Args() args: PaginationArgs,
  ) {
    const requests = await this.userRequestService.fetchUserRequests(
      collection.id,
      collection.type,
      args.cursor,
      args.take,
      user,
    );
    if (E.isLeft(requests)) throwErr(requests.left);
    return requests.right;
  }
}
