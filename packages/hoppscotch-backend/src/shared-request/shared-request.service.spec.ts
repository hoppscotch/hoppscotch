import { Test, TestingModule } from '@nestjs/testing';
import { SharedRequestService } from './shared-request.service';

describe('SharedRequestService', () => {
  let service: SharedRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedRequestService],
    }).compile();

    service = module.get<SharedRequestService>(SharedRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
