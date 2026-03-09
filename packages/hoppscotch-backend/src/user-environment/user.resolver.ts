import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { User } from 'src/user/user.model';
import { UserEnvironment } from './user-environments.model';
import { UserEnvironmentsService } from './user-environments.service';
import * as E from 'fp-ts/Either';
import { throwErr } from '../utils';

@Resolver(() => User)
export class UserEnvsUserResolver {
  constructor(private userEnvironmentsService: UserEnvironmentsService) {}

  @ResolveField(() => [UserEnvironment], {
    description: 'Returns a list of users personal environments',
  })
  async environments(@Parent() user: User): Promise<UserEnvironment[]> {
    return await this.userEnvironmentsService.fetchUserEnvironments(user.uid);
  }

  @ResolveField(() => UserEnvironment, {
    description: 'Returns the users global environments',
  })
  async globalEnvironments(
    @Parent() user: User,
  ): Promise<UserEnvironment | string> {
    const userEnvironment =
      await this.userEnvironmentsService.fetchUserGlobalEnvironment(user.uid);
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }
}
