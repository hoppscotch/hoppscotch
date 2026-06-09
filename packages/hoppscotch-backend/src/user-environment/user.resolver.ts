import { ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from 'src/user/user.model';
import { UserEnvironment } from './user-environments.model';
import { UserEnvironmentsService } from './user-environments.service';
import * as E from 'fp-ts/Either';
import { throwErr } from '../utils';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';

@Resolver(() => User)
export class UserEnvsUserResolver {
  constructor(private userEnvironmentsService: UserEnvironmentsService) {}

  @ResolveField(() => [UserEnvironment], {
    description:
      'Returns a list of the authenticated users personal environments',
  })
  @UseGuards(GqlAuthGuard)
  async environments(@GqlUser() user: User): Promise<UserEnvironment[]> {
    return await this.userEnvironmentsService.fetchUserEnvironments(user.uid);
  }

  @ResolveField(() => UserEnvironment, {
    description: 'Returns the authenticated users global environments',
  })
  @UseGuards(GqlAuthGuard)
  async globalEnvironments(
    @GqlUser() user: User,
  ): Promise<UserEnvironment | string> {
    const userEnvironment =
      await this.userEnvironmentsService.fetchUserGlobalEnvironment(user.uid);
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }
}
