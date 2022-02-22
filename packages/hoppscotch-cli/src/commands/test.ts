import * as TE from "fp-ts/TaskEither";
import { handleError, runCollection } from "../handlers";
import { pipe } from "fp-ts/function";

export const test = (context: any, options: any) => async () => {
  await pipe(
    runCollection(context, true),
    TE.mapLeft(handleError),
    TE.map((_) => process.exit(0))
  )();
};
