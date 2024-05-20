import { Module } from '@nestjs/common';
import { AccessTokenController } from './access-token.controller';

@Module({
  controllers: [AccessTokenController]
})
export class AccessTokenModule {}
