import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { ShortcodeResolver } from './shortcode.resolver';
import { ShortcodeService } from './shortcode.service';

@Module({
  imports: [UserModule],
  providers: [ShortcodeService, ShortcodeResolver],
  exports: [ShortcodeService],
})
export class ShortcodeModule {}
