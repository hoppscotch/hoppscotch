import { HttpStatus } from '@nestjs/common';

/**
 ** Custom interface to handle errors specific to Auth module
 ** Since its REST we need to return HTTP status code along with error message
 */
export type AuthError = {
  message: string;
  statusCode: HttpStatus;
};
