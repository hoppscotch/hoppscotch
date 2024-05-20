import { Module } from '@nestjs/common';
import { AccessTokenController } from './access-token.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccessTokenService } from './access-token.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccessTokenController],
  providers: [AccessTokenService],
})
export class AccessTokenModule {}
