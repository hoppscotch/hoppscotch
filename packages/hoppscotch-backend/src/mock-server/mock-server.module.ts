import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MockServerService } from './mock-server.service';
import { MockServerResolver } from './mock-server.resolver';
import { TeamModule } from 'src/team/team.module';
import { TeamRequestModule } from 'src/team-request/team-request.module';

@Module({
  imports: [PrismaModule, TeamModule, TeamRequestModule],
  providers: [MockServerService, MockServerResolver],
})
export class MockServerModule {}
