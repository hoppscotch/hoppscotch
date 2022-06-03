import fs from "fs/promises";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as J from "fp-ts/Json";
import * as A from "fp-ts/Array";
import * as S from "fp-ts/string";
import isArray from "lodash/isArray";
import { HoppCLIError, error } from "../../types/errors";
import { HoppEnvs, HoppEnvPair } from "../../types/request";
import { checkFile } from "../../utils/checks";

/**
 * Parses env json file for given path and validates the parsed env json object.
 * @param path Path of env.json file to be parsed.
 * @returns For successful parsing we get HoppEnvs object.
 */
export const parseEnvsData = (
  path: unknown
): TE.TaskEither<HoppCLIError, HoppEnvs> =>
  !S.isString(path)
    ? TE.right({ global: [], selected: [] })
    : pipe(
        // Checking if the env.json file exists or not.
        checkFile(path),

        // Trying to read given env json file path.
        TE.chainW((checkedPath) =>
          TE.tryCatch(
            () => fs.readFile(checkedPath),
            (reason) =>
              error({ code: "UNKNOWN_ERROR", data: E.toError(reason) })
          )
        ),

        // Trying to JSON parse the read file data and mapping the entries to HoppEnvPairs.
        TE.chainEitherKW((data) =>
          pipe(
            data.toString(),
            J.parse,
            E.map((jsonData) =>
              jsonData && typeof jsonData === "object" && !isArray(jsonData)
                ? pipe(
                    jsonData,
                    Object.entries,
                    A.map(
                      ([key, value]) =>
                        <HoppEnvPair>{
                          key,
                          value: S.isString(value)
                            ? value
                            : JSON.stringify(value),
                        }
                    )
                  )
                : []
            ),
            E.map((envPairs) => <HoppEnvs>{ global: [], selected: envPairs }),
            E.mapLeft((e) =>
              error({ code: "MALFORMED_ENV_FILE", path, data: E.toError(e) })
            )
          )
        )
      );
