import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import * as E from 'fp-ts/Either';
import { User } from './user/user.model';
import * as A from 'fp-ts/Array';
import { AuthError } from './types/AuthError';
import { AuthTokens } from './types/AuthTokens';
import { Response } from 'express';
import { DateTime } from 'luxon';
import { JSON_INVALID } from './errors';

/**
 * A workaround to throw an exception in an expression.
 * JS throw keyword creates a statement not an expression.
 * This function allows throw to be used as an expression
 * @param errMessage Message present in the error message
 */
export function throwErr(errMessage: string): never {
  throw new Error(errMessage);
}

/**
 * This function allows throw to be used as an expression
 * @param errMessage Message present in the error message
 */
export function throwHTTPErr(errorData: AuthError): never {
  const { message, statusCode } = errorData;
  throw new HttpException(message, statusCode);
}

/**
 * Prints the given value to log and returns the same value.
 * Used for debugging functional pipelines.
 * @param val The value to print
 * @returns `val` itself
 */
export const trace = <T>(val: T) => {
  console.log(val);
  return val;
};

/**
 * Similar to `trace` but allows for labels and also an
 * optional transform function.
 * @param name The label to given to the trace log (log outputs like this "<name>: <value>")
 * @param transform An optional function to transform the log output value (useful for checking specific aspects or transforms (duh))
 * @returns A function which takes a value, and is traced.
 */
export const namedTrace =
  <T>(name: string, transform?: (val: T) => unknown) =>
  (val: T) => {
    console.log(`${name}:`, transform ? transform(val) : val);

    return val;
  };

/**
 * Returns the list of required roles annotated on a GQL Operation
 * @param reflector NestJS Reflector instance
 * @param context NestJS Execution Context
 * @returns An Option which contains the defined roles
 */
// export const getAnnotatedRequiredRoles = (
//   reflector: Reflector,
//   context: ExecutionContext,
// ) =>
//   pipe(
//     reflector.get<TeamMemberRole[]>('requiresTeamRole', context.getHandler()),
//     O.fromNullable,
//   );

/**
 * Gets the user from the NestJS GQL Execution Context.
 * Usually used within guards.
 * @param ctx The Execution Context to use to get it
 * @returns An Option of the user
 */
export const getUserFromGQLContext = (ctx: ExecutionContext) =>
  pipe(
    ctx,
    GqlExecutionContext.create,
    (ctx) => ctx.getContext<{ user?: User }>(),
    ({ user }) => user,
    O.fromNullable,
  );

/**
 * Gets a GQL Argument in the defined operation.
 * Usually used in guards.
 * @param argName The name of the argument to get
 * @param ctx The NestJS Execution Context to use to get it.
 * @returns The argument value typed as `unknown`
 */
export const getGqlArg = <ArgName extends string>(
  argName: ArgName,
  ctx: ExecutionContext,
) =>
  pipe(
    ctx,
    GqlExecutionContext.create,
    (ctx) => ctx.getArgs<object>(),
    // We are not sure if this thing will even exist
    // We pass that worry to the caller
    (args) => args[argName as any] as unknown,
  );

/**
 * Sequences an array of TaskEither values while maintaining an array of all the error values
 * @param arr Array of TaskEithers
 * @returns A TaskEither saying all the errors possible on the left or all the success values on the right
 */
export const taskEitherValidateArraySeq = <A, B>(
  arr: TE.TaskEither<A, B>[],
): TE.TaskEither<A[], B[]> =>
  pipe(
    arr,
    A.map(TE.mapLeft(A.of)),
    A.sequence(
      TE.getApplicativeTaskValidation(T.ApplicativeSeq, A.getMonoid<A>()),
    ),
  );

/**
 * Checks to see if the email is valid or not
 * @param email The email
 * @see https://emailregex.com/ for information on email regex
 * @returns A Boolean depending on the format of the email
 */
export const validateEmail = (email: string) => {
  return new RegExp(
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  ).test(email);
};

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

/*
 * String to JSON parser
 * @param {str} str The string to parse
 * @returns {E.Right<T> | E.Left<"json_invalid">} An Either of the parsed JSON
 */
export function stringToJson<T>(
  str: string,
): E.Right<T | any> | E.Left<string> {
  try {
    return E.right(JSON.parse(str));
  } catch (err) {
    return E.left(JSON_INVALID);
  }
}
