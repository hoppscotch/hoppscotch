import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MockServerService } from './mock-server.service';
import { MockServerResolver } from './mock-server.resolver';
import { TeamModule } from 'src/team/team.module';
import { TeamRequestModule } from 'src/team-request/team-request.module';
import { MockServerController } from './mock-server.controller';

@Module({
  imports: [PrismaModule, TeamModule, TeamRequestModule],
  controllers: [MockServerController],
  providers: [MockServerService, MockServerResolver],
})
export class MockServerModule {}
