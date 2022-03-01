import fs from "fs/promises";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as A from "fp-ts/Array";
import * as RA from "fp-ts/ReadonlyArray";
import { pipe } from "fp-ts/function";
import { RequestStack } from "../interfaces";
import { FormDataEntry, error, HoppCLIError } from "../types";
import { isRESTCollection, requestsParser } from ".";
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
export const parseErrorMessage = (e: any) => {
  let msg: string;
  if (e instanceof Error) {
    const x = e as NodeJS.ErrnoException;
    msg = e.message.replace(x.code! + ":", "").replace("error:", "");
  } else {
    msg = e;
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
    TE.map((a) => pipe(a.toString(), JSON.parse)),
    TE.chainW(
      TE.fromPredicate(
        (data) => Array.isArray(data),
        (_) => error({ code: "MALFORMED_COLLECTION", path })
      )
    ),

    // Validating collections to be HoppRESTCollection.
    TE.chainW((collections) =>
      pipe(
        collections,
        A.map(isRESTCollection),
        E.sequenceArray,
        TE.fromEither,
        TE.mapLeft((_) => error({ code: "MALFORMED_COLLECTION", path })),
        TE.map((_) => collections as HoppCollection<HoppRESTRequest>[])
      )
    )
  );

/**
 * Flattens nested requests.
 * @param collections Array of hopp-collection's hopp-rest-request.
 * @returns Flattened array of requests-stack.
 */
export const flattenRequests = (
  collections: HoppCollection<HoppRESTRequest>[]
): TE.TaskEither<HoppCLIError, RequestStack[]> =>
  pipe(
    collections,
    A.map(requestsParser),
    TE.sequenceArray,
    TE.map(RA.toArray),
    TE.map(A.flatten)
  );
