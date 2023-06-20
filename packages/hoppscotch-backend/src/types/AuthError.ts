import { HttpStatus } from '@nestjs/common';

/**
 ** Custom interface to handle errors specific to Auth module
 ** Since its REST we need to return the HTTP status code along with the error message
 */
export type AuthError = {
  message: string;
  statusCode: HttpStatus;
};
