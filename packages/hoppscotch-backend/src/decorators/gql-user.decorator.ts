import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../user/user.model';
import { GqlExecutionContext } from '@nestjs/graphql';

export const GqlUser = createParamDecorator<any, any, User>(
  (_data: any, context: ExecutionContext) => {
    const { user } = GqlExecutionContext.create(context).getContext<{
      user: User;
    }>();
    if (!user)
      throw new Error(
        '@GqlUser decorator use with null user. Make sure the resolve has the @GqlAuthGuard present.',
      );

    return user;
  },
);
