import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import {
  checkCLIContext,
  checkDebugger,
  flattenRequests,
  parseCollectionData,
  runRequests,
  runTests,
} from "../utils";
import { CLIContext } from "../interfaces";

export const runCollection = (context: CLIContext, debug: boolean = false) =>
  pipe(
    checkDebugger(debug),
    TE.chain((_) => checkCLIContext(context)),
    TE.chain((_) => parseCollectionData(context)),
    TE.chain((a) => flattenRequests(a, debug)),
    TE.chain(runRequests),
    TE.chain(runTests)
  );
