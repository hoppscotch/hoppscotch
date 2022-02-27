import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { handleError, runCollection } from "../handlers";

export const run = (path: string) => async () => {
  await pipe(
    path,
    runCollection,
    TE.mapLeft(handleError),
    TE.map((_) => process.exit(0))
  )();
};
