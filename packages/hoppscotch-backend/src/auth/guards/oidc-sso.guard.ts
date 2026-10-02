import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthProvider, authProviderCheck } from '../helper';
import { Observable } from 'rxjs';
import {
  AUTH_OIDC_PROVIDER_UNAVAILABLE,
  AUTH_PROVIDER_NOT_SPECIFIED,
} from 'src/errors';
import { ConfigService } from '@nestjs/config';
import { throwHTTPErr } from 'src/utils';
import { OIDC_METADATA, OidcMetadata } from '../oidc-discovery';

@Injectable()
export class OidcSSOGuard extends AuthGuard('oidc') implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    // Only registered when OIDC discovery succeeded at startup
    @Optional()
    @Inject(OIDC_METADATA)
    private readonly oidcMetadata?: OidcMetadata,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (
      !authProviderCheck(
        AuthProvider.OIDC,
        this.configService.get('INFRA.VITE_ALLOWED_AUTH_PROVIDERS'),
      )
    ) {
      throwHTTPErr({
        message: AUTH_PROVIDER_NOT_SPECIFIED,
        statusCode: 404,
      });
    }

    if (!this.oidcMetadata) {
      throwHTTPErr({
        message: AUTH_OIDC_PROVIDER_UNAVAILABLE,
        statusCode: 503,
      });
    }

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
