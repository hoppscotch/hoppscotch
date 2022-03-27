import parser from "yargs-parser"
import { pipe, flow } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import * as S from "fp-ts/string"
import { HoppRESTReqBody } from "@hoppscotch/data"
import { detectContentType, parseBody } from "./contentParser"
import { tupleToRecord } from "~/helpers/functional/record"
import {
  objHasProperty,
  arrayObjHasProperty,
} from "~/helpers/functional/object"
import { getDefaultRESTRequest } from "~/newstore/RESTSession"

const defaultRESTRequest = getDefaultRESTRequest()

export const getBody = (
  rawData: string,
  rawContentType: string,
  contentType: HoppRESTReqBody["contentType"]
): { multipartUploads: Record<string, string> } | HoppRESTReqBody => {
  let body: HoppRESTReqBody["body"] = defaultRESTRequest.body.body
  let multipartUploads: Record<string, string> | null = null

  const tempBody = pipe(
    O.Do,

    O.bind("rct", () =>
      pipe(
        rawContentType,
        O.fromPredicate(() => rawContentType !== "")
      )
    ),

    O.bind("cType", ({ rct }) =>
      pipe(
        rct,
        O.of,
        O.map((RCT) => RCT.toLowerCase()),
        O.map((RCT) => RCT.split(";")[0]),
        O.map((RCT) => RCT as HoppRESTReqBody["contentType"])
      )
    ),

    O.bind("rData", () =>
      pipe(
        rawData,
        O.fromPredicate(() => !!rawData && rawData.length > 0)
      )
    ),

    O.bind("ctBody", ({ rct, cType, rData }) =>
      pipe(rData, getBodyFromContentType(rct, cType))
    )
  )

  if (O.isSome(tempBody)) {
    const { cType, ctBody } = tempBody.value
    contentType = cType
    if (typeof ctBody === "string") body = ctBody
    else multipartUploads = ctBody
  } else if (
    !(
      rawContentType &&
      rawContentType.startsWith("multipart/form-data") &&
      rawContentType.includes("boundary")
    )
  ) {
    const newTempBody = pipe(
      rawData,
      O.fromPredicate(() => !!rawData && rawData.length > 0),
      O.chain(getBodyWithoutContentType)
    )

    if (O.isSome(newTempBody)) {
      const { cType, proData } = newTempBody.value
      contentType = cType
      if (typeof proData === "string") body = proData
      else multipartUploads = proData
    }
  } else {
    body = defaultRESTRequest.body.body
    contentType = defaultRESTRequest.body.contentType
  }

  return multipartUploads
    ? { multipartUploads }
    : <HoppRESTReqBody>{
        body,
        contentType,
      }
}

/** Parses body based on the content type
 * @param rct Raw content type
 * @param cType Sanitized content type
 * @returns Option of parsed body
 */
function getBodyFromContentType(
  rct: string,
  cType: HoppRESTReqBody["contentType"]
) {
  return (rData: string) =>
    pipe(
      cType,
      O.fromPredicate((ctype) => ctype === "multipart/form-data"),
      O.match(
        () =>
          pipe(
            parseBody(rData, cType),
            O.filter(
              (parsedBody) =>
                typeof parsedBody === "string" && parsedBody.length > 0
            )
          ),
        (_) =>
          // put body to multipartUploads in post processing
          pipe(
            parseBody(rData, cType, rct),
            O.filter((parsedBody) => typeof parsedBody !== "string")
          )
      )
    )
}

/**
 * Detects and parses body without the help of content type
 * @param rawData Raw body string
 * @returns Option of raw data, detected content type and parsed data
 */
function getBodyWithoutContentType(rawData: string) {
  return pipe(
    O.Do,

    O.bind("rData", () =>
      pipe(
        rawData,
        O.fromPredicate((rd) => rd.length > 0)
      )
    ),

    O.bind("cType", ({ rData }) =>
      pipe(rData, detectContentType, O.fromNullable)
    ),

    O.bind("proData", ({ cType, rData }) => parseBody(rData, cType))
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
  // -F multipart data

  return pipe(
    parsedArguments,
    O.fromPredicate(objHasProperty("F", "string")),
    O.map((args) => [args.F]),
    O.alt(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(arrayObjHasProperty("F", "string")),
        O.map((args) => args.F)
      )
    ),
    O.chain(
      flow(
        A.map(S.split("=")),
        O.fromPredicate((fArgs) => fArgs.length > 0),
        O.map(
          A.map(([k, v]) =>
            pipe(
              parsedArguments,
              O.fromPredicate(objHasProperty("form-string", "boolean")),
              O.match(
                () => [k, v[0] === "@" || v[0] === "<" ? "" : v],
                (_) => [k, v]
              )
            )
          )
        ),
        O.map(A.map(([k, v]) => [k, v] as [string, string])),
        O.map(tupleToRecord)
      )
    )
  )
}
