import * as TE from "fp-ts/TaskEither";
import { runCollection } from "../handlers";
import { handleError } from "../handlers";
import { pipe } from "fp-ts/function";

export const test =
  (context: any, debug: boolean = true) =>
  async () => {
    await pipe(
      runCollection(context, debug),
      TE.mapLeft((e) => pipe(e, handleError))
    )();
  };
