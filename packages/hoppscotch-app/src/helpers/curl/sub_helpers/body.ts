import parser from "yargs-parser"
import { pipe, flow } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray"
import * as S from "fp-ts/string"
import {
  HoppRESTReqBody,
  HoppRESTReqBodyFormData,
  ValidContentTypes,
  knownContentTypes,
} from "@hoppscotch/data"
import { detectContentType, parseBody } from "./contentParser"
import { tupleToRecord } from "~/helpers/functional/record"
import {
  objHasProperty,
  objHasArrayProperty,
} from "~/helpers/functional/object"

type BodyReturnType =
  | { type: "FORMDATA"; body: Record<string, string> }
  | {
      type: "NON_FORMDATA"
      body: Exclude<HoppRESTReqBody, HoppRESTReqBodyFormData>
    }

/** Parses body based on the content type
 * @param rData Raw data
 * @param cType Sanitized content type
 * @returns Option of parsed body of type string | Record<string, string>
 */
const getBodyFromContentType =
  (rData: string, cType: HoppRESTReqBody["contentType"]) => (rct: string) =>
    pipe(
      cType,
      O.fromPredicate((ctype) => ctype === "multipart/form-data"),
      O.chain(() =>
        pipe(
          // pass rawContentType for boundary ascertion
          parseBody(rData, cType, rct),
          O.filter((parsedBody) => typeof parsedBody !== "string")
        )
      ),
      O.alt(() =>
        pipe(
          parseBody(rData, cType),
          O.filter(
            (parsedBody) =>
              typeof parsedBody === "string" && parsedBody.length > 0
          )
        )
      )
    )

const getContentTypeFromRawContentType = (rawContentType: string) =>
  pipe(
    rawContentType,
    O.fromPredicate((rct) => rct.length > 0),
    // get everything before semi-colon
    O.map(flow(S.toLowerCase, S.split(";"), RNEA.head)),
    // if rawContentType is valid, cast it to contentType type
    O.filter((ct) => Object.keys(knownContentTypes).includes(ct)),
    O.map((ct) => ct as HoppRESTReqBody["contentType"])
  )

const getContentTypeFromRawData = (rawData: string) =>
  pipe(
    rawData,
    O.fromPredicate((rd) => rd.length > 0),
    O.map(detectContentType)
  )

export const getBody = (
  rawData: string,
  rawContentType: string,
  contentType: HoppRESTReqBody["contentType"]
): O.Option<BodyReturnType> => {
  return pipe(
    O.Do,

    O.bind("cType", () =>
      pipe(
        // get provided content-type
        contentType,
        O.fromNullable,
        // or figure it out
        O.alt(() => getContentTypeFromRawContentType(rawContentType)),
        O.alt(() => getContentTypeFromRawData(rawData))
      )
    ),

    O.bind("rData", () =>
      pipe(
        rawData,
        O.fromPredicate(() => rawData.length > 0)
      )
    ),

    O.bind("ctBody", ({ cType, rData }) =>
      pipe(rawContentType, getBodyFromContentType(rData, cType))
    ),

    O.map(({ cType, ctBody }) =>
      typeof ctBody === "string"
        ? {
            type: "NON_FORMDATA",
            body: {
              body: ctBody,
              contentType: cType as Exclude<
                ValidContentTypes,
                "multipart/form-data"
              >,
            },
          }
        : { type: "FORMDATA", body: ctBody }
    )
  )
}

/**
 * Parses and structures multipart/form-data from -F argument of curl command
 * @param parsedArguments Parsed Arguments object
 * @returns Option of Record<string, string> type containing key-value pairs of multipart/form-data
 */
export function getFArgumentMultipartData(
  parsedArguments: parser.Arguments
): O.Option<Record<string, string>> {
  // --form or -F multipart data

  return pipe(
    parsedArguments,
    // make it an array if not already
    O.fromPredicate(objHasProperty("F", "string")),
    O.map((args) => [args.F]),
    O.alt(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasArrayProperty("F", "string")),
        O.map((args) => args.F)
      )
    ),
    O.chain(
      flow(
        A.map(S.split("=")),
        // can only have a key and no value
        O.fromPredicate((fArgs) => fArgs.length > 0),
        O.map(
          flow(
            A.map(([k, v]) =>
              pipe(
                parsedArguments,
                // form-string option allows for "@" and "<" prefixes
                //   without them being considered as files
                O.fromPredicate(objHasProperty("form-string", "boolean")),
                O.match(
                  // leave the value field empty for files
                  () => [k, v[0] === "@" || v[0] === "<" ? "" : v],
                  () => [k, v]
                )
              )
            ),
            A.map(([k, v]) => [k, v] as [string, string]),
            tupleToRecord
          )
        )
      )
    )
  )
}
