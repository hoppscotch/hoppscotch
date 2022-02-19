import { CLIContext } from "../interfaces";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import { error, HoppCLIError } from "../types";
import {
  checkCLIContext,
  checkConnection,
  flattenRequests,
  parseCollectionData,
  runRequests,
  runTests,
} from "../utils";
import { pipe } from "fp-ts/function";

export const runCollection =
  (
    context: CLIContext,
    debug: boolean = false
  ): TE.TaskEither<HoppCLIError, null> =>
  async () => {
    try {
      if (debug) {
        const debuggerConn = await checkConnection("localhost", 9999)();
        if (E.isLeft(debuggerConn)) return debuggerConn;
      }

      return pipe(
        context,
        checkCLIContext,
        TE.chainW((_) => parseCollectionData(context)),
        TE.chainW((a) => flattenRequests(a, debug)),
        TE.chainW(runRequests),
        TE.chainW(runTests),
        TE.map((a) => a)
      )();
    } catch (e) {
      return E.left(error({ code: "UNKNOWN_ERROR", data: E.toError(e) }));
    }
  };
