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
  });
  res.cookie('refresh_token', authTokens.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: refreshTokenValidity,
  });
  if (redirect) {
    res.status(HttpStatus.OK).redirect(process.env.REDIRECT_URL);
  } else res.status(HttpStatus.OK).send();
};

/**
 * Decode the cookie header from incoming websocket connects and returns a auth token pair
 * @param rawCookies cookies from the websocket connection
 * @returns AuthTokens for JWT strategy to use
 */
export const subscriptionContextCookieParser = (rawCookies: string) => {
  const access_tokenString = rawCookies.split(';')[0].split('=')[1];
  const refresh_tokenString = rawCookies.split(';')[1].split('=')[1];
  return <AuthTokens>{
    access_token: access_tokenString,
    refresh_token: refresh_tokenString,
  };
};
