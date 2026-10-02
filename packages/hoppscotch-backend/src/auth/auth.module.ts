import { Module, Provider } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RTJwtStrategy } from './strategies/rt-jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { OidcStrategy } from './strategies/oidc.strategy';
import { discoverOidcMetadata, OIDC_METADATA } from './oidc-discovery';
import { AuthProvider, authProviderCheck } from './helper';
import { ConfigService } from '@nestjs/config';
import {
  getConfiguredSSOProvidersFromInfraConfig,
  isInfraConfigTablePopulated,
  loadInfraConfiguration,
} from 'src/infra-config/helper';
import { InfraConfigModule } from 'src/infra-config/infra-config.module';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('INFRA.JWT_SECRET'),
      }),
    }),
    InfraConfigModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {
  static async register() {
    if (process.env.GENERATE_GQL_SCHEMA === 'true') {
      return { module: AuthModule };
    }

    const isInfraConfigPopulated = await isInfraConfigTablePopulated();
    if (!isInfraConfigPopulated) {
      return { module: AuthModule };
    }

    const allowedAuthProviders =
      await getConfiguredSSOProvidersFromInfraConfig();

    const providers: Provider[] = [
      ...(authProviderCheck(AuthProvider.GOOGLE, allowedAuthProviders)
        ? [GoogleStrategy]
        : []),
      ...(authProviderCheck(AuthProvider.GITHUB, allowedAuthProviders)
        ? [GithubStrategy]
        : []),
      ...(authProviderCheck(AuthProvider.MICROSOFT, allowedAuthProviders)
        ? [MicrosoftStrategy]
        : []),
    ];

    if (authProviderCheck(AuthProvider.OIDC, allowedAuthProviders)) {
      providers.push(...(await AuthModule.oidcProviders()));
    }

    return {
      module: AuthModule,
      providers: [...providers, JwtStrategy, RTJwtStrategy],
    };
  }

  /**
   * Resolve the OIDC provider endpoints via discovery and register the strategy.
   * A misconfigured or unreachable issuer disables OIDC login instead of
   * preventing the backend from starting.
   */
  private static async oidcProviders(): Promise<Provider[]> {
    const { INFRA } = await loadInfraConfiguration();
    try {
      const metadata = await discoverOidcMetadata(INFRA.OIDC_ISSUER);
      return [{ provide: OIDC_METADATA, useValue: metadata }, OidcStrategy];
    } catch (error) {
      console.error(
        `OIDC login disabled: could not load provider metadata for issuer "${INFRA.OIDC_ISSUER}".`,
        error,
      );
      return [];
    }
  }
}
