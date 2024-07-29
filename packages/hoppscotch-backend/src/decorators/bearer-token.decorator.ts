import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 ** Decorator to fetch refresh_token from cookie
 */
export const BearerToken = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();

    // authorization token will be "Bearer <token>"
    const authorization = request.headers['authorization'];
    // Remove "Bearer " and return the token only
    return authorization.split(' ')[1];
  },
);
