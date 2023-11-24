import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { MailerModule } from 'src/mailer/mailer.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RTJwtStrategy } from './strategies/rt-jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { AuthProvider, authProviderCheck } from './helper';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    MailerModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    RTJwtStrategy,
    ...(authProviderCheck(AuthProvider.GOOGLE) ? [GoogleStrategy] : []),
    ...(authProviderCheck(AuthProvider.GITHUB) ? [GithubStrategy] : []),
    ...(authProviderCheck(AuthProvider.MICROSOFT) ? [MicrosoftStrategy] : []),
  ],
  controllers: [AuthController],
})
export class AuthModule {}
