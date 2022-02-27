import fs from "fs/promises";
import { CommanderError } from "commander";
import { join, extname } from "path";
import { pipe } from "fp-ts/function";
import {
  translateToNewRESTCollection,
  isHoppRESTRequest,
} from "@hoppscotch/data";
import * as S from "fp-ts/string";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { error, HoppCLIError } from "../types";

/**
 * Typeguard to check valid Hoppscotch REST Collection
 * @param param The object to be checked
 * @returns Boolean value corresponding to the validity check
 */
export function isRESTCollection(param: any): E.Either<boolean, boolean> {
  let _param = param;
  if (!_param) return E.left(false);
  if (!_param.v) {
    _param = translateToNewRESTCollection(param);
  }

  if (!_param.name || typeof _param.name !== "string") return E.left(false);
  if (!Array.isArray(_param.requests)) {
    return E.left(false);
  } else {
    for (const request of _param.requests) {
      const _isHoppRequest = isHoppRESTRequest(request);
      if (!_isHoppRequest) return E.left(false);
    }
  }
  if (!Array.isArray(_param.folders)) {
    return E.left(false);
  } else {
    for (const folder of _param.folders) {
      const _isRESTCollection = isRESTCollection(folder);
      if (!_isRESTCollection) return E.left(false);
    }
  }
  return E.right(true);
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

export const isExpectResultPass = (
  expectResult: string
): E.Either<boolean, boolean> =>
  expectResult === "pass" ? E.right(true) : E.left(false);

export const isSafeCommanderError = (error: any) => {
  if (error instanceof CommanderError && error.exitCode === 0) {
    process.exit(0);
  }
};

export const checkCLIPath =
  (path: string): TE.TaskEither<HoppCLIError, string> =>
  async () => {
    if (!S.isString(path)) {
      return E.left(error({ code: "NO_FILE_PATH" }));
    }
    return pipe(path, checkFileURL)();
  };
