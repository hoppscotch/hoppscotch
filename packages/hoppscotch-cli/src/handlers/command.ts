import chalk from "chalk";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { CLIContext, RequestStack, TestScriptData } from "../interfaces";
import {
  checkConnection,
  requestRunner,
  getTestResponse,
  getTableResponse,
  getTableStream,
  runTests,
  checkCLIContext,
  parseCollectionData,
  flattenRequests,
} from "../utils";
import { error, HoppCLIError, HoppErrorCode as HEC } from "../types";
import { handleError } from "./error";

const runRequests = (
  requests: RequestStack[]
): TE.TaskEither<HoppCLIError<HEC>, TestScriptData[]> =>
  pipe(
    TE.tryCatch(
      async () => {
        const testScriptData: TestScriptData[] = [];

        if (A.isNonEmpty(requests)) {
          console.clear();
          const tableStream = getTableStream();
          tableStream.write([
            pipe("PATH", chalk.cyanBright, chalk.bold),
            pipe("METHOD", chalk.cyanBright, chalk.bold),
            pipe("ENDPOINT", chalk.cyanBright, chalk.bold),
            pipe("STATUS CODE", chalk.cyanBright, chalk.bold),
          ]);

          for (const request of requests) {
            const response = await requestRunner(request)();
            const testResponse = getTestResponse(response);
            const testScriptPair: TestScriptData = {
              name: request.name,
              testScript: request.testScript,
              response: testResponse,
            };
            const tableResponse = getTableResponse(response);

            tableStream.write([
              tableResponse.path,
              tableResponse.method,
              tableResponse.endpoint,
              tableResponse.statusCode,
            ]);

            testScriptData.push(testScriptPair);
          }
        }

        return testScriptData;
      },
      (reason) => error({ code: "UNKNOWN_ERROR", data: E.toError(reason) })
    )
  );

export const runCollection =
  (
    context: CLIContext,
    debug: boolean = false
  ): TE.TaskEither<HoppCLIError<HEC>, null> =>
  async () => {
    try {
      if (debug) {
        await pipe(
          checkConnection("localhost", 9999),
          TE.mapLeft((e) => handleError(e))
        )();
      }

      return pipe(
        context,
        checkCLIContext,
        TE.chainW((_) => parseCollectionData(context)),
        TE.chainW(flattenRequests),
        TE.chainW(runRequests),
        TE.chainW(runTests),
        TE.map((a) => a)
      )();
    } catch (e) {
      return E.left(
        error({ code: "UNKNOWN_ERROR", data: e as NodeJS.ErrnoException })
      );
    }
  };
