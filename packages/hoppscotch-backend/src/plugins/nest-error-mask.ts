import { HttpStatus } from '@nestjs/common';
import { GraphQLError } from 'graphql';

// Same mapping @nestjs/apollo applied, so clients keep seeing the codes they
// match on (e.g. UNAUTHENTICATED triggers a token refresh in the web app).
const PREDEFINED_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'BAD_USER_INPUT',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
};

type HttpExceptionLike = Error & {
  status: number;
  response: { statusCode: number } & Record<string, unknown>;
};

const isHttpException = (error: unknown): error is HttpExceptionLike =>
  error instanceof Error &&
  typeof (error as HttpExceptionLike).status === 'number' &&
  !!(error as HttpExceptionLike).response?.statusCode;

/**
 * Yoga `maskedErrors.maskError` reproducing the previous Apollo behaviour:
 * - Nest HTTP exceptions become GraphQL errors with a matching
 *   `extensions.code` (and the exception response under `originalError`).
 * - Other resolver errors keep their message (the clients match on error
 *   codes like `user/not_found`) with code INTERNAL_SERVER_ERROR.
 * - GraphQL errors (validation, complexity, ...) pass through unchanged.
 * Stack traces are never included.
 */
export const maskNestError = (error: unknown): Error => {
  if (!(error instanceof GraphQLError)) {
    return new GraphQLError(
      error instanceof Error ? error.message : 'Unexpected error.',
      { extensions: { code: 'INTERNAL_SERVER_ERROR' } },
    );
  }

  const original = error.originalError;
  if (!original || original instanceof GraphQLError) return error;

  const baseOptions = {
    nodes: error.nodes,
    source: error.source,
    positions: error.positions,
    path: error.path,
  };

  if (isHttpException(original)) {
    const code = PREDEFINED_CODES[original.status];
    return new GraphQLError(original.message, {
      ...baseOptions,
      extensions: {
        ...error.extensions,
        code: code ?? 'INTERNAL_SERVER_ERROR',
        ...(code ? {} : { status: original.status }),
        originalError: original.response,
      },
    });
  }

  return new GraphQLError(original.message, {
    ...baseOptions,
    extensions: { ...error.extensions, code: 'INTERNAL_SERVER_ERROR' },
  });
};
