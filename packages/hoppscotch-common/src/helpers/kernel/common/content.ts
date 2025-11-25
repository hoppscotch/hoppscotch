import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"

import { ContentType, MediaType, content } from "@hoppscotch/kernel"
import { EffectiveHoppRESTRequest } from "~/helpers/utils/EffectiveURL"

/**
 * Content processors for converting raw body strings to standardized ContentType objects.
 *
 * If a processor is called, it's expected that it's correct content type.
 * NOTE: Validation belongs in upper layers, not the processor layer.
 */
const Processors = {
  /**
   * Processes JSON content as pre-stringified JSON text.
   *
   * NOTE: Assumes input is valid JSON in string format since user selected "JSON".
   * Uses `content.text()` with JSON media type to avoid double-encoding.
   */
  json: {
    process: (body: string): E.Either<Error, ContentType> =>
      E.right(content.text(body, MediaType.APPLICATION_JSON)),
  },

  /**
   * Processes binary content from Blob/File objects.
   *
   * Converts Blob to Uint8Array while preserving filename and content type.
   * Returns TaskEither since arrayBuffer() is async.
   */
  binary: {
    process: (file: Blob): TE.TaskEither<Error, ContentType> =>
      pipe(
        TE.tryCatch(
          () => file.arrayBuffer(),
          () => new Error("Binary read failed")
        ),
        TE.map((buffer) =>
          content.binary(
            new Uint8Array(buffer),
            file.type || "application/octet-stream",
            file instanceof File ? file.name : "unknown"
          )
        )
      ),
  },

  /**
   * Processes URL-encoded form data.
   *
   * Takes a raw string and wraps it in the urlencoded content type.
   * The string is expected to be already properly encoded (e.g., "key1=value1&key2=value2").
   */
  urlencoded: {
    process: (body: string): E.Either<Error, ContentType> =>
      pipe(
        E.right(body),
        E.map((contents) => {
          return content.urlencoded(contents)
        })
      ),
  },

  /**
   * Processes XML content as text with XML media type.
   *
   * Assumes input is valid XML string format.
   */
  xml: {
    process: (body: string): E.Either<Error, ContentType> =>
      E.right(content.xml(body, MediaType.APPLICATION_XML)),
  },

  /**
   * Processes plain text content.
   *
   * Fallback processor for any text-based content that doesn't fit other categories.
   */
  text: {
    process: (body: string): E.Either<Error, ContentType> =>
      E.right(content.text(body, MediaType.TEXT_PLAIN)),
  },
}

/**
 * Maps content type strings to appropriate processor.
 *
 * @param contentType - MIME type string (e.g., "application/json")
 * @returns Processor function that converts string body to ContentType
 */
const getProcessor = (contentType: string) => {
  switch (contentType) {
    case "application/json":
    case "application/ld+json":
    case "application/hal+json":
    case "application/vnd.api+json":
      return Processors.json.process
    case "application/xml":
    case "text/xml":
      return Processors.xml.process
    case "application/x-www-form-urlencoded":
      return Processors.urlencoded.process
    case "text/html":
    case "text/plain":
      return Processors.text.process
    default:
      return Processors.text.process
  }
}

/**
 * Transforms HTTP request body content into standardized `ContentType` objects for the `relay` system.
 *
 * Returns None if no body content is present or if the body type doesn't match the content type.
 *
 * @param request - EffectiveHoppRESTRequest containing body and content type information
 * @returns TaskEither<Error, Option<ContentType>> - Success with optional content, or error
 */
export const transformContent = (
  request: EffectiveHoppRESTRequest
): TE.TaskEither<Error, O.Option<ContentType>> => {
  const { body, effectiveFinalBody } = request

  if (!body.contentType || !effectiveFinalBody) {
    return TE.right(O.none)
  }

  switch (body.contentType) {
    case "multipart/form-data":
      if (!(effectiveFinalBody instanceof FormData)) {
        return TE.right(O.none)
      }
      return TE.right(O.some(content.multipart(effectiveFinalBody)))

    case "application/octet-stream":
      if (!(effectiveFinalBody instanceof Blob)) {
        return TE.right(O.none)
      }
      return pipe(Processors.binary.process(effectiveFinalBody), TE.map(O.some))

    default:
      if (typeof effectiveFinalBody !== "string") {
        return TE.right(O.none)
      }
      return pipe(
        TE.fromEither(getProcessor(body.contentType)(effectiveFinalBody)),
        TE.map(O.some)
      )
  }
}
