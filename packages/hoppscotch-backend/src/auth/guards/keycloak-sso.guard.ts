import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AUTH_PROVIDER_NOT_SPECIFIED } from 'src/errors';
import { throwHTTPErr } from 'src/utils';
import { AuthProvider, authProviderCheck } from '../helper';
import { KeycloakOIDCService } from '../keycloak-oidc.service';

function ensureKeycloakIsEnabled(configService: ConfigService) {
  if (
    !authProviderCheck(
      AuthProvider.KEYCLOAK,
      configService.get('INFRA.VITE_ALLOWED_AUTH_PROVIDERS'),
    )
  ) {
    throwHTTPErr({ message: AUTH_PROVIDER_NOT_SPECIFIED, statusCode: 404 });
  }
}

@Injectable()
export class KeycloakSSOStartGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly keycloakOIDCService: KeycloakOIDCService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    ensureKeycloakIsEnabled(this.configService);

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();
    const authorizationUrl =
      await this.keycloakOIDCService.getAuthorizationUrl(request);

    response.redirect(authorizationUrl);
    return false;
  }
}

@Injectable()
export class KeycloakSSOCallbackGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly keycloakOIDCService: KeycloakOIDCService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    ensureKeycloakIsEnabled(this.configService);

    const request = context.switchToHttp().getRequest();
    const { user, state } =
      await this.keycloakOIDCService.authenticateCallback(request);

    request.user = user;
    request.authInfo = { state };
    return true;
  }
}
