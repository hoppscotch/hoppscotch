import { Module } from '@nestjs/common';
import { SortTeamCollectionResolver } from './sort-team-collection.resolver';
import { SortService } from './sort.service';
import { TeamCollectionModule } from 'src/team-collection/team-collection.module';
import { TeamRequestModule } from 'src/team-request/team-request.module';
import { UserCollection } from 'src/user-collection/user-collections.model';
import { UserRequest } from 'src/user-request/user-request.model';

@Module({
  imports: [
    UserCollection,
    UserRequest,
    TeamCollectionModule,
    TeamRequestModule,
  ],
  providers: [SortTeamCollectionResolver, SortService],
})
export class SortModule {}
