import * as TE from "fp-ts/TaskEither"

/**
 * A utility type which gives you the type of the left value of a TaskEither
 */
export type TELeftType<T extends TE.TaskEither<any, any>> =
  T extends TE.TaskEither<
    infer U,
    // eslint-disable-next-line
    infer _
  >
    ? U
    : never
