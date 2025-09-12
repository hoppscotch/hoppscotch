import { Module } from '@nestjs/common';
import { SortTeamCollectionResolver } from './sort-team-collection.resolver';
import { SortService } from './sort.service';
import { TeamCollectionModule } from 'src/team-collection/team-collection.module';
import { TeamRequestModule } from 'src/team-request/team-request.module';
import { SortUserCollectionResolver } from './sort-user-collection.resolver';
import { UserCollectionModule } from 'src/user-collection/user-collection.module';
import { UserRequestModule } from 'src/user-request/user-request.module';
import { TeamModule } from 'src/team/team.module';

@Module({
  imports: [
    UserCollectionModule,
    UserRequestModule,
    TeamModule,
    TeamCollectionModule,
    TeamRequestModule,
  ],
  providers: [
    SortUserCollectionResolver,
    SortTeamCollectionResolver,
    SortService,
  ],
})
export class SortModule {}
