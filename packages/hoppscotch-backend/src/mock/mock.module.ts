import { Module } from '@nestjs/common/decorators';
import { MockController } from './mock.controller';
import { MockService } from './mock.service';

@Module({
  providers: [MockService],
  exports: [MockService],
  controllers: [MockController],
})
export class MockModule {}
