import { Test, TestingModule } from '@nestjs/testing';
import { AsrService } from './asr.service';

describe('AsrService', () => {
  let service: AsrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AsrService],
    }).compile();

    service = module.get<AsrService>(AsrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
