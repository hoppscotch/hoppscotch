import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { User } from './user/user.model';
import * as A from 'fp-ts/Array';

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
 * @returns A Boolean depending on the format of the email
 */
export const validateEmail = (email: string) => {
  return new RegExp(
    "([!#-'*+/-9=?A-Z^-~-]+(.[!#-'*+/-9=?A-Z^-~-]+)*|\"([]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(.[!#-'*+/-9=?A-Z^-~-]+)*|[[\t -Z^-~]*])",
  ).test(email);
};
