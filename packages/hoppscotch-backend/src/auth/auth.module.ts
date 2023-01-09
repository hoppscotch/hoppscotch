import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { MailerModule } from 'src/mailer/mailer.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UserModule, MailerModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
