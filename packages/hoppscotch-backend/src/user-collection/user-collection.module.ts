import { Module } from '@nestjs/common';
import { UserCollectionService } from './user-collection.service';
import { UserCollectionResolver } from './user-collection.resolver';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],
  providers: [UserCollectionService, UserCollectionResolver],
  exports: [UserCollectionService],
})
export class UserCollectionModule {}
