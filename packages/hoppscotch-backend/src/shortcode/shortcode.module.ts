import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { UserModule } from 'src/user/user.module';
import { ShortcodeResolver } from './shortcode.resolver';
import { ShortcodeService } from './shortcode.service';

@Module({
  imports: [PrismaModule, UserModule, PubSubModule],
  providers: [ShortcodeService, ShortcodeResolver],
  exports: [ShortcodeService],
})
export class ShortcodeModule {}
