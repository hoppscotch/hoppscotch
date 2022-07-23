import * as TE from "fp-ts/TaskEither";
import * as S from "fp-ts/string";
import { pipe } from "fp-ts/function";
import { error, HoppCLIError } from "../../types/errors";

export const parseDelayOption = (
  delay: unknown
): TE.TaskEither<HoppCLIError, number> =>
  !S.isString(delay)
    ? TE.right(0)
    : pipe(
        delay,
        Number,
        TE.fromPredicate(Number.isSafeInteger, () =>
          error({
            code: "INVALID_ARGUMENT",
            data: "Expected '-d, --delay' value to be number",
          })
        )
      );
