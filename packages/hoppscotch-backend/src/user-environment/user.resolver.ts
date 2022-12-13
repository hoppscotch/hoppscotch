import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { User } from 'src/user/user.model';
import { UserEnvironment } from './user-environments.model';
import { UserEnvironmentsService } from './user-environments.service';

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
    description:
      'Returns a list of user variables inside a global environments',
  })
  async globalEnvironments(
    @Parent() user: User,
  ): Promise<UserEnvironment | string> {
    return await this.userEnvironmentsService.fetchUserGlobalEnvironments(
      user.uid,
    );
  }
}
