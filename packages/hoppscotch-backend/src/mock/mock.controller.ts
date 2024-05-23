import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { MockService } from './mock.service';
import { Response } from 'express';

@Controller('mock')
export class MockController {
  constructor(private mock: MockService) {}

  @All('*')
  async getter(@Req() request: Request, @Res() response: Response) {
    return await this.mock.getResponse(request, response);
  }
}
