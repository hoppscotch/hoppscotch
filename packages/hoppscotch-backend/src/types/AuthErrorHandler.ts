import { HttpStatus } from '@nestjs/common';

export interface AuthErrorHandler {
  message: string;
  statusCode: HttpStatus;
}
