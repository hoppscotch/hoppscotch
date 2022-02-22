import fs from "fs/promises";
import { CommanderError } from "commander";
import { join, extname } from "path";
import tcpp from "tcp-ping";
import { pipe } from "fp-ts/function";
import {
  HoppRESTRequest,
  translateToNewRequest,
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
 * Typeguard to check valid Hoppscotch Collection JSON
 * @param x The object to be checked
 * @returns Boolean value corresponding to the validity check
 */
function isRESTRequest(param: { x: any }): param is { x: HoppRESTRequest } {
  if (!param.x || typeof param.x !== "object") return false;
  if (!param.x.v) {
    param.x = translateToNewRequest(param.x);
  }
  const entries = [
    "name",
    "method",
    "endpoint",
    "preRequestScript",
    "testScript",
  ];
  for (const y of entries) {
    if (typeof param.x[y] !== "string") return false;
  }
  const testParamOrHeader = (y: any) => {
    if (typeof y.key !== "string") return false;
    if (typeof y.value !== "string") return false;
    if (typeof y.active !== "boolean") return false;
    return true;
  };
  if (!Array.isArray(param.x.params)) {
    return false;
  } else {
    const checkParams = (param.x.params as any[]).every(testParamOrHeader);
    if (!checkParams) return false;
  }
  if (!Array.isArray(param.x.headers)) {
    return false;
  } else {
    const checkHeaders = (param.x.headers as any[]).every(testParamOrHeader);
    if (!checkHeaders) return false;
  }
  if (!param.x.auth || typeof param.x.auth !== "object") {
    return false;
  } else {
    if (typeof param.x.auth.authActive !== "boolean") return false;
    if (!param.x.auth.authType || typeof param.x.auth.authType !== "string") {
      return false;
    } else {
      switch (param.x.auth.authType) {
        case "basic": {
          if (
            !param.x.auth.username ||
            typeof param.x.auth.username !== "string"
          )
            return false;
          if (
            !param.x.auth.password ||
            typeof param.x.auth.password !== "string"
          )
            return false;
          break;
        }
        case "bearer": {
          if (!param.x.auth.token || typeof param.x.auth.token !== "string")
            return false;
          break;
        }
        case "oauth-2": {
          const entries = [
            "token",
            "oidcDiscoveryURL",
            "authURL",
            "accessTokenURL",
            "clientID",
            "scope",
          ];
          for (const y of entries) {
            if (!param.x.auth[y] || typeof param.x.auth[y] !== "string")
              return false;
          }
          break;
        }
        case "none": {
          break;
        }
        default: {
          return false;
        }
      }
    }
  }
  if (!param.x.body || typeof param.x.body !== "object") {
    return false;
  } else {
    if (typeof param.x.body.contentType === "undefined") return false;
    if (typeof param.x.body.body === "undefined") return false;
  }
  return true;
}
>>>>>>> main

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
  (context: CLIContext): TE.TaskEither<HoppCLIError, null> =>
  async () => {
    if (context.interactive) {
      await parseCLIOptions(context)();
    } else if (!S.isString(context.path)) {
      return E.left(error({ code: "NO_FILE_PATH" }));
    }
    return await pipe(
      context.path!,
      checkFileURL,
      TE.map((_) => null)
    )();
  };
