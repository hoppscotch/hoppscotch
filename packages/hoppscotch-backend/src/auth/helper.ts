import { HttpException, HttpStatus } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AuthError } from 'src/types/AuthError';
import { AuthTokens } from 'src/types/AuthTokens';
import { Response } from 'express';

/**
 * This function allows throw to be used as an expression
 * @param errMessage Message present in the error message
 */
export function throwHTTPErr(errorData: AuthError): never {
  const { message, statusCode } = errorData;
  throw new HttpException(message, statusCode);
}

/**
 * Sets and returns the cookies in the response object on successful authentication
 * @param res Express Response Object
 * @param authTokens Object containing the access and refresh tokens
 * @param redirect if true will redirect to provided URL else just send a 200 status code
 */
export const authCookieHandler = (
  res: Response,
  authTokens: AuthTokens,
  redirect: boolean,
) => {
  const currentTime = DateTime.now();
  const accessTokenValidity = currentTime
    .plus({
      milliseconds: parseInt(process.env.ACCESS_TOKEN_VALIDITY),
    })
    .toMillis();
  const refreshTokenValidity = currentTime
    .plus({
      milliseconds: parseInt(process.env.REFRESH_TOKEN_VALIDITY),
    })
    .toMillis();

  res.cookie('access_token', authTokens.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: accessTokenValidity,
    signed: true,
  });
  res.cookie('refresh_token', authTokens.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: refreshTokenValidity,
    signed: true,
  });
  if (redirect) {
    res.status(HttpStatus.OK).redirect(process.env.REDIRECT_URL);
  } else res.status(HttpStatus.OK).send();
};
