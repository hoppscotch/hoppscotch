import { Module } from '@nestjs/common';
import { PublishedDocsResolver } from './published-docs.resolver';
import { PublishedDocsService } from './published-docs.service';
import { TeamModule } from 'src/team/team.module';

@Module({
  imports: [TeamModule],
  providers: [PublishedDocsResolver, PublishedDocsService],
})
export class PublishedDocsModule {}
