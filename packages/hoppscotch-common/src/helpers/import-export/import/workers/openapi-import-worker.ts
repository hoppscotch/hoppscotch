import { Buffer } from "buffer"
import process from "process"

// Set up global shims for the swagger-parser library
self.Buffer = Buffer
self.global = self
self.process = process

import SwaggerParser from "@apidevtools/swagger-parser"
import * as E from "fp-ts/Either"

const validateDocs = async (docs: any) => {
  try {
    const res = await SwaggerParser.validate(docs, {
      // @ts-expect-error - this is a valid option, but seems like the types are not updated
      continueOnError: true,
    })

    return E.right(res)
  } catch (error) {
    return E.left("COULD_NOT_VALIDATE" as const)
  }
}

const dereferenceDocs = async (docs: any) => {
  try {
    const res = await SwaggerParser.dereference(docs)

    return E.right(res)
  } catch (error) {
    return E.left("COULD_NOT_DEREFERENCE" as const)
  }
}

self.addEventListener("message", async (event) => {
  if (event.data.type === "validate") {
    const res = await validateDocs(event.data.docs)

    self.postMessage({
      type: "VALIDATION_RESULT",
      data: res,
    })
  }

  if (event.data.type === "dereference") {
    const res = await dereferenceDocs(event.data.docs)

    self.postMessage({
      type: "DEREFERENCE_RESULT",
      data: res,
    })
  }
})
