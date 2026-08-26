import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TeamCollectionModule } from 'src/team-collection/team-collection.module';
import { UserCollectionModule } from 'src/user-collection/user-collection.module';
import { McpShareService } from './mcp-share.service';
import { McpShareResolver } from './mcp-share.resolver';
import { McpShareController } from './mcp-share.controller';

@Module({
  imports: [PrismaModule, UserCollectionModule, TeamCollectionModule],
  controllers: [McpShareController],
  providers: [McpShareService, McpShareResolver],
})
export class McpShareModule {}
