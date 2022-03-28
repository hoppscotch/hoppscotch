import fs from "fs/promises";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as A from "fp-ts/Array";
import * as J from "fp-ts/Json";
import { pipe } from "fp-ts/function";
import { FormDataEntry } from "../types/request";
import { error, HoppCLIError } from "../types/errors";
import { isRESTCollection, isHoppErrnoException } from "./checks";
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";

/**
 * Parses array of FormDataEntry to FormData.
 * @param values Array of FormDataEntry.
 * @returns FormData with key-value pair from FormDataEntry.
 */
export const toFormData = (values: FormDataEntry[]) => {
  const formData = new FormData();

  values.forEach(({ key, value }) => formData.append(key, value));

  return formData;
};

/**
 * Parses provided error message to maintain hopp-error messages.
 * @param e Custom error data.
 * @returns Parsed error message without extra spaces.
 */
export const parseErrorMessage = (e: unknown) => {
  let msg: string;
  if (isHoppErrnoException(e)) {
    msg = e.message.replace(e.code! + ":", "").replace("error:", "");
  } else if (typeof e === "string") {
    msg = e;
  } else {
    msg = JSON.stringify(e);
  }
  return msg.replace(/\n+$|\s{2,}/g, "").trim();
};

/**
 * Parses collection json file for given path:context.path, and validates
 * the parsed collectiona array.
 * @param path Collection json file path.
 * @returns For successful parsing we get array of HoppCollection<HoppRESTRequest>,
 */
export const parseCollectionData = (
  path: string
): TE.TaskEither<HoppCLIError, HoppCollection<HoppRESTRequest>[]> =>
  pipe(
    // Trying to read give collection json path.
    TE.tryCatch(
      () => pipe(path, fs.readFile),
      (reason) => error({ code: "UNKNOWN_ERROR", data: E.toError(reason) })
    ),

    // Checking if parsed file data is array.
    TE.chainEitherKW((data) =>
      pipe(
        data.toString(),
        J.parse,
        E.map((jsonData) => (Array.isArray(jsonData) ? jsonData : [jsonData])),
        E.mapLeft((e) =>
          error({ code: "MALFORMED_COLLECTION", path, data: E.toError(e) })
        )
      )
    ),

    // Validating collections to be HoppRESTCollection.
    TE.chainW(
      TE.fromPredicate(A.every(isRESTCollection), () =>
        error({
          code: "MALFORMED_COLLECTION",
          path,
          data: "Please check the collection data.",
        })
      )
    )
  );
