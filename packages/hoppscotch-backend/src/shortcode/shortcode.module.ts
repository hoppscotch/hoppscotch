import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { UserModule } from 'src/user/user.module';
import { ShortcodeResolver } from './shortcode.resolver';
import { ShortcodeService } from './shortcode.service';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    PubSubModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [ShortcodeService, ShortcodeResolver],
  exports: [ShortcodeService],
})
export class ShortcodeModule {}
