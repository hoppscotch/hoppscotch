import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { handleError, runCollection } from "../handlers";
import { CLIContext } from "../interfaces";

export const run = (context: any, options: any) => async () => {
  const cliContext: CLIContext = {
    interactive: options.interactive,
    path: context,
  };

  await pipe(
    cliContext,
    runCollection,
    TE.mapLeft((e) => pipe(e, handleError))
  )();
};
