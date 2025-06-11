import { Module } from '@nestjs/common';
import { UserCollectionModule } from 'src/user-collection/user-collection.module';
import { UserRequestUserCollectionResolver } from './resolvers/user-collection.resolver';
import { UserRequestResolver } from './resolvers/user-request.resolver';
import { UserRequestService } from './user-request.service';

@Module({
  imports: [UserCollectionModule],
  providers: [
    UserRequestResolver,
    UserRequestUserCollectionResolver,
    UserRequestService,
  ],
})
export class UserRequestModule {}
