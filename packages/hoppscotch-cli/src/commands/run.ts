import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { handleError, runCollection } from "../handlers";

export const run = (context: any, options: any) => async () => {
  await pipe(
    { interactive: options.interactive, path: context },
    runCollection,
    TE.mapLeft(handleError),
    TE.map((_) => process.exit(0))
  )();
};
