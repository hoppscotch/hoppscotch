import * as TE from "fp-ts/TaskEither";
import { handleError, runCollection } from "../handlers";
import { pipe } from "fp-ts/function";

export const test =
  (context: any, debug: boolean = true) =>
  async () => {
    await pipe(
      runCollection(context, debug),
      TE.mapLeft((e) => pipe(e, handleError))
    )();
  };
