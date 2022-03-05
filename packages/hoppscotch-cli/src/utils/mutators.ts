import fs from "fs/promises";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as A from "fp-ts/Array";
import * as RA from "fp-ts/ReadonlyArray";
import * as J from "fp-ts/Json";
import * as S from "fp-ts/string";
import { flow, pipe } from "fp-ts/function";
import { RequestStack } from "../interfaces";
import { FormDataEntry, error, HoppCLIError } from "../types";
import { isRESTCollection, requestsParser, isHoppErrno } from ".";
import {
  HoppCollection,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTRequest,
} from "@hoppscotch/data";

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
  if (isHoppErrno(e)) {
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
        E.mapLeft((e) => error({ code: "SYNTAX_ERROR", data: E.toError(e) }))
      )
    ),

    // Validating collections to be HoppRESTCollection.
    TE.chainW(
      TE.fromPredicate(A.every(isRESTCollection), () =>
        error({ code: "MALFORMED_COLLECTION", path })
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
    A.map(requestsParser), // Mapping each collection to RequestStack.
    TE.sequenceArray,
    TE.map(flow(RA.flatten, RA.toArray))
  );

/**
 * Reduces array of HoppRESTParam or HoppRESTHeader to dictionary
 * style key-value pair object.
 * @param metaData Array of meta-data to reduce.
 * @returns Object with unique key-value pair.
 */
export const reduceMetaDataToDict = (
  metaData: HoppRESTParam[] | HoppRESTHeader[]
) =>
  pipe(
    metaData,

    // Excluding non-active & empty key request meta-data.
    A.filter(({ active, key }) => active && !S.isEmpty(key)),

    // Reducing array of request-meta-data to key-value pair object.
    A.reduce({}, (target, { key, value }) =>
      Object.assign(target, { [`${key}`]: value })
    )
  );
