import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { User } from 'src/user/user.model';
import { UserEnvironment } from './user-environments.model';
import { UserEnvironmentsService } from './user-environments.service';
import * as E from 'fp-ts/Either';
import { throwErr } from '../utils';
import { GqlUser } from '../decorators/gql-user.decorator';
import { USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS } from '../errors';

@Resolver(() => User)
export class UserEnvsUserResolver {
  constructor(private userEnvironmentsService: UserEnvironmentsService) {}

  @ResolveField(() => [UserEnvironment], {
    description: 'Returns a list of users personal environments',
  })
  async environments(
    @Parent() user: User,
    @GqlUser() requestingUser: User,
  ): Promise<UserEnvironment[]> {
    if (requestingUser?.uid !== user.uid) return [];
    return await this.userEnvironmentsService.fetchUserEnvironments(user.uid);
  }

  @ResolveField(() => UserEnvironment, {
    description: 'Returns the users global environments',
  })
  async globalEnvironments(
    @Parent() user: User,
    @GqlUser() requestingUser: User,
  ): Promise<UserEnvironment | string> {
    if (requestingUser?.uid !== user.uid) {
      throwErr(USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS);
    }
    const userEnvironment =
      await this.userEnvironmentsService.fetchUserGlobalEnvironment(user.uid);
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }
}
