import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import { TeamMemberRole } from './team/team.model';
import { User } from './user/user.model';
import { ENV_EMPTY_AUTH_PROVIDERS, ENV_NOT_FOUND_KEY_AUTH_PROVIDERS, ENV_NOT_SUPPORT_AUTH_PROVIDERS, JSON_INVALID } from './errors';
import { AuthProvider } from './auth/helper';

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
export const getAnnotatedRequiredRoles = (
  reflector: Reflector,
  context: ExecutionContext,
) =>
  pipe(
    reflector.get<TeamMemberRole[]>('requiresTeamRole', context.getHandler()),
    O.fromNullable,
  );

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
    (ctx) => ctx.getContext().req,
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
/**
 *
 * @param title string whose length we need to check
 * @param length minimum length the title needs to be
 * @returns boolean if title is of valid length or not
 */
export function isValidLength(title: string, length: number) {
  if (title.length < length) {
    return false;
  }

  return true;
}

/**
 * This function is called by bootstrap() in main.ts
 *  It checks if the "ALLOWED_AUTH_PROVIDERS" environment variable is properly set or not.
 * If not, it throws an error.
 */
export function checkEnvironmentAuthProvider() {
  if (!process.env.hasOwnProperty('ALLOWED_AUTH_PROVIDERS')) {
    throw new Error(ENV_NOT_FOUND_KEY_AUTH_PROVIDERS);
  }

  if (process.env.ALLOWED_AUTH_PROVIDERS === '') {
    throw new Error(ENV_EMPTY_AUTH_PROVIDERS);
  }

  const givenAuthProviders = process.env.ALLOWED_AUTH_PROVIDERS.split(',').map(
    (provider) => provider.toLocaleUpperCase(),
  );
  const supportedAuthProviders = Object.values(AuthProvider).map(
    (provider: string) => provider.toLocaleUpperCase(),
  );

  for (const givenAuthProvider of givenAuthProviders) {
    if (!supportedAuthProviders.includes(givenAuthProvider)) {
      throw new Error(ENV_NOT_SUPPORT_AUTH_PROVIDERS);
    }
  }
}
