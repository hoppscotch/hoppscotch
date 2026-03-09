import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { UserEnvsUserResolver } from './user.resolver';
import { UserEnvironmentsResolver } from './user-environments.resolver';
import { UserEnvironmentsService } from './user-environments.service';

@Module({
  imports: [UserModule],
  providers: [
    UserEnvironmentsResolver,
    UserEnvironmentsService,
    UserEnvsUserResolver,
  ],
  exports: [UserEnvironmentsService],
})
export class UserEnvironmentsModule {}
