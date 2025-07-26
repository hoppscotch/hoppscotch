import { Module } from '@nestjs/common';
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
import { AuthProvider, authProviderCheck } from './helper';
import { ConfigService } from '@nestjs/config';
import {
  getConfiguredSSOProvidersFromInfraConfig,
  isInfraConfigTablePopulated,
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
    const isInfraConfigPopulated = await isInfraConfigTablePopulated();
    if (!isInfraConfigPopulated) {
      return { module: AuthModule };
    }

    const allowedAuthProviders =
      await getConfiguredSSOProvidersFromInfraConfig();

    const providers = [
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

    return {
      module: AuthModule,
      providers: [...providers, JwtStrategy, RTJwtStrategy],
    };
  }
}
