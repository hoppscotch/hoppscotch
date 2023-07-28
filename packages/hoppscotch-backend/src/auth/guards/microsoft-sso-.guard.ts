import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthProvider, authProviderCheck, throwHTTPErr } from '../helper';

@Injectable()
export class MicrosoftSSOGuard
  extends AuthGuard('microsoft')
  implements CanActivate
{
  canActivate(context: ExecutionContext): boolean {
    if (!authProviderCheck(AuthProvider.MICROSOFT))
      throwHTTPErr({
        message: 'Microsoft auth is not enabled',
        statusCode: 404,
      });

    return true;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    return {
      state: {
        redirect_uri: req.query.redirect_uri,
      },
    };
  }
}
