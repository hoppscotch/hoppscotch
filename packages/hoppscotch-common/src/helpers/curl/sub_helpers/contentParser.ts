import { HoppRESTReqBody } from "@hoppscotch/data"
import * as O from "fp-ts/Option"
import * as RA from "fp-ts/ReadonlyArray"
import * as S from "fp-ts/string"
import { pipe, flow } from "fp-ts/function"
import { tupleToRecord } from "~/helpers/functional/record"
import { safeParseJSON } from "~/helpers/functional/json"
import { optionChoose } from "~/helpers/functional/option"

const isJSON = flow(safeParseJSON, O.isSome)

const isXML = (rawData: string) =>
  pipe(
    rawData,
    O.fromPredicate(() => /<\/?[a-zA-Z][\s\S]*>/i.test(rawData)),
    O.chain(prettifyXml),
    O.isSome
  )

const isHTML = (rawData: string) =>
  pipe(
    rawData,
    O.fromPredicate(() => /<\/?[a-zA-Z][\s\S]*>/i.test(rawData)),
    O.isSome
  )

const isFormData = (rawData: string) =>
  pipe(
    rawData.match(/^-{2,}[A-Za-z0-9]+\\r\\n/),
    O.fromNullable,
    O.filter((boundaryMatch) => boundaryMatch.length > 0),
    O.isSome
  )

const isXWWWFormUrlEncoded = (rawData: string) =>
  pipe(
    rawData,
    O.fromPredicate((rd) => /([^&=]+)=([^&=]*)/.test(rd)),
    O.isSome
  )

/**
 * Detects the content type of the input string
 * @param rawData String for which content type is to be detected
 * @returns Content type of the data
 */
export const detectContentType = (
  rawData: string
): HoppRESTReqBody["contentType"] =>
  pipe(
    rawData,
    optionChoose([
      [(rd) => !rd, null],
      [isJSON, "application/json" as const],
      [isFormData, "multipart/form-data" as const],
      [isXML, "application/xml" as const],
      [isHTML, "text/html" as const],
      [isXWWWFormUrlEncoded, "application/x-www-form-urlencoded" as const],
    ]),
    O.getOrElseW(() => "text/plain" as const)
  )

const multipartFunctions = {
  getBoundary(rawData: string, rawContentType: string | undefined) {
    return pipe(
      rawContentType,
      O.fromNullable,
      O.filter((rct) => rct.length > 0),
      O.match(
        () => this.getBoundaryFromRawData(rawData),
        (rct) => this.getBoundaryFromRawContentType(rawData, rct)
      )
    )
  },

  getBoundaryFromRawData(rawData: string) {
    return pipe(
      rawData.match(/(-{2,}[A-Za-z0-9]+)\\r\\n/g),
      O.fromNullable,
      O.filter((boundaryMatch) => boundaryMatch.length > 0),
      O.map((matches) => matches[0].slice(0, -4))
    )
  },

  getBoundaryFromRawContentType(rawData: string, rawContentType: string) {
    return pipe(
      rawContentType.match(/boundary=(.+)/),
      O.fromNullable,
      O.filter((boundaryContentMatch) => boundaryContentMatch.length > 1),
      O.filter((matches) =>
        rawData.replaceAll("\\r\\n", "").endsWith("--" + matches[1] + "--")
      ),
      O.map((matches) => "--" + matches[1])
    )
  },

  splitUsingBoundaryAndNewLines(rawData: string, boundary: string) {
    return pipe(
      rawData,
      S.split(RegExp(`${boundary}-*`)),
      RA.filter((p) => p !== "" && p.includes("name")),
      RA.map((p) =>
        pipe(
          p.replaceAll(/\\r\\n+/g, "\\r\\n"),
          S.split("\\r\\n"),
          RA.filter((q) => q !== "")
        )
      )
    )
  },

  getNameValuePair(pair: readonly string[]) {
    return pipe(
      pair,
      O.fromPredicate((p) => p.length > 1),
      O.chain((pair) => O.fromNullable(pair[0].match(/ name="(\w+)"/))),
      O.filter((nameMatch) => nameMatch.length > 0),
      O.chain((nameMatch) =>
        pipe(
          nameMatch[0],
          S.replace(/"/g, ""),
          S.split("="),
          O.fromPredicate((q) => q.length === 2),
          O.map(
            (nameArr) =>
              [nameArr[1], pair[0].includes("filename") ? "" : pair[1]] as [
                string,
                string
              ]
          )
        )
      )
    )
  },
}

const getFormDataBody = (rawData: string, rawContentType: string | undefined) =>
  pipe(
    multipartFunctions.getBoundary(rawData, rawContentType),
    O.map((boundary) =>
      pipe(
        multipartFunctions.splitUsingBoundaryAndNewLines(rawData, boundary),
        RA.filterMap((p) => multipartFunctions.getNameValuePair(p)),
        RA.toArray
      )
    ),

    O.filter((arr) => arr.length > 0),
    O.map(tupleToRecord)
  )

const getHTMLBody = flow(formatHTML, O.of)

const getXMLBody = (rawData: string) =>
  pipe(
    rawData,
    prettifyXml,
    O.alt(() => O.some(rawData))
  )

const getFormattedJSON = flow(
  safeParseJSON,
  O.map((parsedJSON) => JSON.stringify(parsedJSON, null, 2)),
  O.getOrElse(() => "{ }")
)

const getXWWWFormUrlEncodedBody = flow(
  decodeURIComponent,
  (decoded) => decoded.match(/(([^&=]+)=?([^&=]*))/g),
  O.fromNullable,
  O.map((pairs) => pairs.map((p) => p.replace("=", ": ")).join("\n"))
)

/**
 * Parses provided string according to the content type
 * @param rawData Data to be parsed
 * @param contentType Content type of the data
 * @param rawContentType Optional parameter required for multipart/form-data
 * @returns Option of parsed body as string or Record object for multipart/form-data
 */
export function parseBody(
  rawData: string,
  contentType: HoppRESTReqBody["contentType"],
  rawContentType?: string
): O.Option<string | Record<string, string>> {
  switch (contentType) {
    case "application/hal+json":
    case "application/ld+json":
    case "application/vnd.api+json":
    case "application/json":
      return O.some(getFormattedJSON(rawData))

    case "application/x-www-form-urlencoded":
      return getXWWWFormUrlEncodedBody(rawData)

    case "multipart/form-data":
      return getFormDataBody(rawData, rawContentType)

    case "text/html":
      return getHTMLBody(rawData)

    case "application/xml":
      return getXMLBody(rawData)

    case "text/plain":
    default:
      return O.some(rawData)
  }
}

/**
 * Formatter Functions
 */

/**
 * Prettifies XML string
 * @param sourceXml The string to format
 * @returns Indented XML string (uses spaces)
 */
function prettifyXml(sourceXml: string) {
  return pipe(
    O.tryCatch(() => {
      const xmlDoc = new DOMParser().parseFromString(
        sourceXml,
        "application/xml"
      )

      if (xmlDoc.querySelector("parsererror")) {
        throw new Error("Unstructured Body")
      }

      const xsltDoc = new DOMParser().parseFromString(
        [
          // describes how we want to modify the XML - indent everything
          '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
          '  <xsl:strip-space elements="*"/>',
          '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
          '    <xsl:value-of select="normalize-space(.)"/>',
          "  </xsl:template>",
          '  <xsl:template match="node()|@*">',
          '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
          "  </xsl:template>",
          '  <xsl:output indent="yes"/>',
          "</xsl:stylesheet>",
        ].join("\n"),
        "application/xml"
      )

      const xsltProcessor = new XSLTProcessor()
      xsltProcessor.importStylesheet(xsltDoc)
      const resultDoc = xsltProcessor.transformToDocument(xmlDoc)
      const resultXml = new XMLSerializer().serializeToString(resultDoc)

      return resultXml
    })
  )
}

/**
 * Prettifies HTML string
 * @param htmlString The string to format
 * @returns Indented HTML string (uses spaces)
 */
function formatHTML(htmlString: string) {
  const tab = "  "
  let result = ""
  let indent = ""
  const emptyTags = [
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]

  const spl = htmlString.split(/>\s*</)
  spl.forEach((element) => {
    if (element.match(/^\/\w/)) {
      indent = indent.substring(tab.length)
    }

    result += indent + "<" + element + ">\n"

    if (
      element.match(/^<?\w[^>]*[^/]$/) &&
      !emptyTags.includes(element.match(/^([a-z]*)/i)?.at(1) || "")
    ) {
      indent += tab
    }
  })

  return result.substring(1, result.length - 2)
}
