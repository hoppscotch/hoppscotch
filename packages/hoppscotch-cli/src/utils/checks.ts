import fs from "fs/promises";
import { join } from "path";
import { flow, pipe } from "fp-ts/function";
import {
  isHoppRESTRequest,
  HoppCollection,
  HoppRESTRequest,
} from "@hoppscotch/data";
import * as A from "fp-ts/Array";
import * as S from "fp-ts/string";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import { error, HoppCLIError, HoppErrno } from "../types";

/**
 * Typeguard to check valid Hoppscotch REST Collection.
 * @param param The object to be checked.
 * @returns Boolean value corresponding to the validity check.
 */
export const isRESTCollection = (
  param: unknown
): param is HoppCollection<HoppRESTRequest> =>
  pipe(
    param,

    // Validate param to be null-object.
    O.fromPredicate((a) => typeof a === "object" && a !== null),

    // Check if "v" exists in param and equals 1.
    O.chain(
      flow(
        Object,
        O.fromPredicate((a) => "v" in a && a.v === 1)
      )
    ),

    // Check if param has string property "name".
    O.chainFirst(O.fromPredicate((a) => "name" in a && S.isString(a.name))),

    /**
     * Check if param has array of HoppRESTRequest property
     * "requests".
     */
    O.chainFirst(O.fromPredicate((a) => "requests" in a)),
    O.chainFirst((a) =>
      pipe(
        a.requests,
        O.fromPredicate(Array.isArray),
        O.chain(O.fromPredicate(A.every(isHoppRESTRequest)))
      )
    ),

    /**
     * Check if param has array of HoppCollection<HoppRESTRequest>
     * property "folders".
     */
    O.chainFirst(O.fromPredicate((a) => "folders" in a)),
    O.chainFirst((a) =>
      pipe(
        a.folders,
        O.fromPredicate(Array.isArray),
        O.chain(O.fromPredicate(A.every(isRESTCollection)))
      )
    ),

    /**
     * Return true if param is HoppCollection<HoppRESTRequest>,
     * else false.
     */
    O.map((_) => true),
    O.getOrElseW(() => false)
  );

/**
 * Checks if the given file path exists and is of JSON type.
 * @param path The input file path to check.
 * @returns Absolute path for input file path.
 */
export const checkFilePath = (
  path: string
): TE.TaskEither<HoppCLIError, string> =>
  pipe(
    path,

    // Check if given path is string type.
    TE.fromPredicate(S.isString, () => error({ code: "NO_FILE_PATH" })),

    // Try to access given file path.
    TE.tryCatchK(
      () => pipe(path, join, fs.access),
      () => error({ code: "FILE_NOT_FOUND", path: path })
    ),

    /**
     * On successfully accessing given file path, we map file path to
     * absolute path and return abs file path if file is JSON type.
     */
    TE.map(() => join(path)),
    TE.chainW(
      TE.fromPredicate(S.endsWith(".json"), (absPath) =>
        error({ code: "FILE_NOT_JSON", path: absPath })
      )
    )
  );

/**
 * Checks if given error data is of type HoppCLIError, based on
 * existence of code property.
 * @param error Error data to check.
 * @returns Boolean based on data validation.
 */
export const isHoppCLIError = (error: any): error is HoppCLIError => {
  return error.code !== undefined;
};

/**
 * Checks if given error data is of type HoppErrno, based on
 * existence of name property.
 * @param error Error data to check.
 * @returns Boolean based on data validation.
 */
export const isHoppErrno = (error: any): error is HoppErrno => {
  return error.name !== undefined;
};
