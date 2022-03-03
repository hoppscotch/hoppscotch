import { HoppRESTReqBody } from "@hoppscotch/data"
import * as S from "fp-ts/string"
import * as RA from "fp-ts/ReadonlyArray"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { tupleToRecord } from "~/helpers/functional/record"
import { safeParseJSON } from "~/helpers/functional/json"

/**
 * Detects the content type of the input string
 * @param rawData String for which content type is to be detected
 * @returns Content type of the data
 */
export function detectContentType(
  rawData: string
): HoppRESTReqBody["contentType"] {
  let contentType: HoppRESTReqBody["contentType"]

  if (O.isSome(safeParseJSON(rawData))) {
    contentType = "application/json"
  } else if (/<\/?[a-zA-Z][\s\S]*>/i.test(rawData)) {
    if (O.isSome(prettifyXml(rawData))) {
      contentType = "application/xml"
    } else {
      // everything is HTML
      contentType = "text/html"
    }
  } else if (/([^&=]+)=([^&=]+)/.test(rawData)) {
    contentType = "application/x-www-form-urlencoded"
  } else {
    contentType = pipe(
      rawData.match(/^-{2,}.+\\r\\n/),
      O.fromNullable,
      O.filter((boundaryMatch) => boundaryMatch && boundaryMatch.length > 1),
      O.match(
        () => "text/plain",
        () => "multipart/form-data"
      )
    )
  }

  return contentType
}

/**
 * Prettifies XML string
 * @param sourceXml The string to format
 * @returns Indented XML string (uses spaces)
 */
const prettifyXml = (sourceXml: string) =>
  pipe(
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

/**
 * Prettifies HTML string
 * @param htmlString The string to format
 * @returns Indented HTML string (uses spaces)
 */
const formatHTML = (htmlString: string) => {
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

/**
 * Parses provided string according to the content type
 * @param rawData Data to be parsed
 * @param contentType Content type of the data
 * @param boundary Optional parameter required for multipart/form-data content type
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
    case "application/json": {
      return pipe(
        rawData,
        safeParseJSON,
        O.map((parsedJSON) => JSON.stringify(parsedJSON, null, 2)),
        O.getOrElse(() => "{}"),
        O.fromNullable
      )
    }

    case "application/x-www-form-urlencoded": {
      return pipe(
        rawData,
        O.fromNullable,
        O.map(decodeURIComponent),
        O.chain((rd) =>
          pipe(rd.match(/(([^&=]+)=?([^&=]+))/g), O.fromNullable)
        ),
        O.map((pairs) => pairs.map((p) => p.replace("=", ": ")).join("\n"))
      )
    }

    case "multipart/form-data": {
      /**
       * O.bind binds "boundary"
       * If rawContentType is present, try to extract boundary from it
       * If rawContentTpe is not present, try to regex match the boundary from rawData
       * In case both the above attempts fail, O.map is not executed and the pipe is
       * short-circuited. O.none is returned.
       *
       * In the event the boundary is ascertained, process rawData to get key-value
       * pairs and convert them to a tuple array. If the array is not empty,
       * convert it to Record<string, string> type and return O.some of it.
       */
      return pipe(
        O.Do,

        O.bind("boundary", () =>
          pipe(
            rawContentType,
            O.fromNullable,
            O.match(
              () =>
                pipe(
                  rawData.match(/^-{2,}.+\\r\\n/),
                  O.fromNullable,
                  O.filter((boundaryMatch) => boundaryMatch.length > 1),
                  O.map((matches) => matches[0])
                ),
              (rct) =>
                pipe(
                  rct.match(/boundary=(.+)/),
                  O.fromNullable,
                  O.filter(
                    (boundaryContentMatch) => boundaryContentMatch.length > 1
                  ),
                  O.filter((matches) =>
                    rawData
                      .replaceAll("\\r\\n", "")
                      .endsWith("--" + matches[1] + "--")
                  ),
                  O.map((matches) => "--" + matches[1])
                )
            )
          )
        ),

        O.map(({ boundary }) =>
          pipe(
            rawData,
            S.split(boundary),
            RA.filter((p) => p !== "" && p.includes("name")),
            RA.map((p) =>
              pipe(
                p.replaceAll(/[\r\n]+/g, "\r\n"),
                S.split("\\r\\n"),
                RA.filter((q) => q !== "")
              )
            ),
            RA.filterMap((p) =>
              pipe(
                p[0].match(/name=(.+)$/),
                O.fromNullable,
                O.filter((nameMatch) => nameMatch.length > 0),
                O.map((nameMatch) => {
                  const name = nameMatch[0]
                    .replaceAll(/"/g, "")
                    .split("=", 2)[1]
                  return [name, p[0].includes("filename") ? "" : p[1]] as [
                    string,
                    string
                  ]
                })
              )
            ),
            RA.toArray
          )
        ),

        O.filter((arr) => arr.length > 0),
        O.map(tupleToRecord)
      )
    }

    case "text/html": {
      return pipe(rawData, O.fromNullable, O.map(formatHTML))
    }

    case "application/xml": {
      return pipe(
        rawData,
        O.fromNullable,
        O.chain(prettifyXml),
        O.match(
          () => rawData,
          (res) => res
        ),
        O.fromNullable
      )
    }

    case "text/plain":
    default:
      return O.some(rawData)
  }
}
