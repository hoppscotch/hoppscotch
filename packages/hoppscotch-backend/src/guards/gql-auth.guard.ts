import { CanActivate, Injectable, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../user/user.model';
import { IncomingHttpHeaders } from 'http2';
import { AUTH_FAIL } from 'src/errors';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const ctx = GqlExecutionContext.create(context).getContext<{
        reqHeaders: IncomingHttpHeaders;
        user: User | null;
      }>();

      if (
        ctx.reqHeaders.authorization &&
        ctx.reqHeaders.authorization.startsWith('Bearer ')
      ) {
        const idToken = ctx.reqHeaders.authorization.split(' ')[1];

        const authUser: User = {
          id: 'aabb22ccdd',
          name: 'exampleUser',
          image: 'http://example.com/avatar',
          email: 'me@example.com',
          isAdmin: false,
          createdOn: new Date(),
        };

        ctx.user = authUser;

        return true;
      } else {
        return false;
      }
    } catch (e) {
      throw new Error(AUTH_FAIL);
    }
  }
}
