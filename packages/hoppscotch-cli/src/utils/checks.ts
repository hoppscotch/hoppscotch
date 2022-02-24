import fs from "fs/promises";
import { CommanderError } from "commander";
import { join, extname } from "path";
import tcpp from "tcp-ping";
import { pipe } from "fp-ts/function";
import {
  HoppRESTRequest,
  translateToNewRESTCollection,
  HoppCollection,
  isHoppRESTRequest,
} from "@hoppscotch/data";
import * as S from "fp-ts/string";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { error, HoppCLIError } from "../types";
import { CLIContext } from "../interfaces";
import { parseCLIOptions } from ".";

/**
 * Typeguard to check valid Hoppscotch REST Collection
 * @param param The object to be checked
 * @returns Boolean value corresponding to the validity check
 */
export function isRESTCollection(param: {
  x: any;
}): param is { x: HoppCollection<HoppRESTRequest> } {
  if (!param.x) return false;
  if (!param.x.v) {
    param.x = translateToNewRESTCollection(param.x);
  }

  if (!param.x.name || typeof param.x.name !== "string") return false;
  if (!Array.isArray(param.x.requests)) {
    return false;
  } else {
    const checkRequests = [];
    for (const [idx, _] of param.x.requests.entries()) {
      const x = {
        ...param.x.requests[idx],
      };
      checkRequests.push(isHoppRESTRequest(x));
      param.x.requests[idx] = x;
    }
    if (!checkRequests.every((val) => val)) return false;
  }
  if (!Array.isArray(param.x.folders)) {
    return false;
  } else {
    const checkFolders = [];
    for (const [idx, _] of param.x.folders.entries()) {
      const pm = {
        x: { ...param.x.folders[idx] },
      };
      checkFolders.push(isRESTCollection(pm));
      param.x.folders[idx] = pm.x;
    }
    if (!checkFolders.every((val) => val)) return false;
  }
  return true;
}

/**
 * Check if the file exists and check the file extension
 * @param path The input file path to check
 * @returns TE.TaskEither<any, string>
 */
export const checkFileURL =
  (path: string): TE.TaskEither<HoppCLIError, string> =>
  async () => {
    try {
      const fullPath = join(path);
      await fs.access(fullPath);
      if (extname(fullPath) !== ".json") {
        return E.left(error({ code: "FILE_NOT_JSON", path: fullPath }));
      }
      return E.right(fullPath);
    } catch (e) {
      return E.left(error({ code: "FILE_NOT_FOUND", path: path }));
    }
  };

/**
 * Checking TCP connection at given port and address exists or not.
 * @param address Address to ping (@default: localhost).
 * @param port Port to ping for given address (@default: 80).
 * @returns Promise<Either<Error, tcpp.Result>>
 */
export const checkConnection =
  (address: string, port: number): TE.TaskEither<HoppCLIError, tcpp.Result> =>
  () =>
    new Promise((resolve) => {
      tcpp.ping({ address: address, port: port, attempts: 1 }, (err, data) => {
        if (err) {
          resolve(E.left(error({ code: "DEBUGGER_ERROR", data: err })));
        }
        const pingResultErr = data.results[0].err;
        if (pingResultErr) {
          resolve(
            E.left(error({ code: "DEBUGGER_ERROR", data: pingResultErr }))
          );
        }
        resolve(E.right(data));
      });
    });

export const isExpectResultPass = (
  expectResult: string
): E.Either<boolean, boolean> =>
  expectResult === "pass" ? E.right(true) : E.left(false);

export const isSafeCommanderError = (error: any) => {
  if (error instanceof CommanderError && error.exitCode === 0) {
    process.exit(0);
  }
};

export const checkCLIContext =
  (context: CLIContext): TE.TaskEither<HoppCLIError, string> =>
  async () => {
    if (context.interactive) {
      await parseCLIOptions(context)();
    } else if (!S.isString(context.path)) {
      return E.left(error({ code: "NO_FILE_PATH" }));
    }
    return pipe(context.path!, checkFileURL)();
  };

export const checkDebugger =
  (debug: boolean): TE.TaskEither<HoppCLIError, null> =>
  async () => {
    if (debug) {
      return pipe(
        checkConnection("localhost", 9999),
        TE.map((_) => null)
      )();
    }
    return E.right(null);
  };
