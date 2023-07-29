import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthProvider, authProviderCheck, throwHTTPErr } from '../helper';
import { Observable } from 'rxjs';

@Injectable()
export class MicrosoftSSOGuard
  extends AuthGuard('microsoft')
  implements CanActivate
{
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (!authProviderCheck(AuthProvider.MICROSOFT))
      throwHTTPErr({
        message: 'Microsoft auth is not enabled',
        statusCode: 404,
      });

    return super.canActivate(context);
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
