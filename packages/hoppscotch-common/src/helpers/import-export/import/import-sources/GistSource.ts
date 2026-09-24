import UrlImport from "~/components/importExport/ImportExportSteps/UrlImport.vue"
import { defineStep } from "~/composables/step-components"

import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { z } from "zod"

import { v4 as uuidv4 } from "uuid"
import { Ref, unref } from "vue"
import { getService } from "~/modules/dioc"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { parseBodyAsJSON } from "~/helpers/functional/json"

const interceptorService = getService(KernelInterceptorService)

export function GistSource(metadata: {
  caption: string
  actionLabel?: string
  onImportFromGist: (
    importResult: E.Either<string, string[]>,
    ...args: any[]
  ) => any | Promise<any>
  isLoading?: Ref<boolean>
  description?: string
  showUpdateOptions?: boolean
  initialUrl?: string | Ref<string | undefined>
}) {
  const stepID = uuidv4()

  return defineStep(stepID, UrlImport, () => ({
    caption: metadata.caption,
    actionLabel: metadata.actionLabel,
    description: metadata.description,
    showUpdateOptions: metadata.showUpdateOptions,
    initialUrl: unref(metadata.initialUrl),
    onImportFromURL: (gistResponse: unknown, ...args: any[]) => {
      const fileSchema = z.object({
        files: z.record(z.object({ content: z.string() })),
      })

      const parseResult = fileSchema.safeParse(gistResponse)

      if (!parseResult.success) {
        metadata.onImportFromGist(E.left("INVALID_GIST"), ...args)
        return
      }

      const contents = Object.values(parseResult.data.files).map(
        ({ content }) => content
      )

      metadata.onImportFromGist(E.right(contents), ...args)
    },
    fetchLogic: fetchGistFromUrl,
    loading: metadata.isLoading?.value,
  }))
}
const fetchGistFromUrl = async (url: string) => {
  // Extract the gist ID from the URL (eg. https://gist.github.com/username/gistID/...)
  const gistID = url.split("/")[4]

  const { response } = interceptorService.execute({
    id: Date.now(),
    url: `https://api.github.com/gists/${gistID}`,
    method: "GET",
    version: "HTTP/1.1",
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  })

  const res = await response

  if (E.isLeft(res)) {
    return E.left("REQUEST_FAILED")
  }

  const responsePayload = parseBodyAsJSON<unknown>(res.right.body)

  if (O.isSome(responsePayload)) {
    return E.right(responsePayload.value)
  }

  return E.left("REQUEST_FAILED")
}
