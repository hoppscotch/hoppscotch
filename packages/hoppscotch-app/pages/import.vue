<template>
  <div></div>
</template>

<script setup lang="ts">
import axios from "axios"
import * as TO from "fp-ts/TaskOption"
import * as TE from "fp-ts/TaskEither"
import * as RA from "fp-ts/ReadonlyArray"

import { useRoute, useRouter, onMounted } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import { appendRESTCollections } from "~/newstore/collections"
import { useToast, useI18n } from "~/helpers/utils/composables"
import { URLImporters } from "~/helpers/import-export/import/importers"
import { IMPORTER_INVALID_FILE_FORMAT } from "~/helpers/import-export/import"
import { OPENAPI_DEREF_ERROR } from "~/helpers/import-export/import/openapi"
import { isOfType } from "~/helpers/functional/primtive"
import { TELeftType } from "~/helpers/functional/taskEither"

const route = useRoute()
const router = useRouter()
const toast = useToast()
const t = useI18n()

const IMPORTER_INVALID_TYPE = "importer_invalid_type" as const
const IMPORTER_INVALID_FETCH = "importer_invalid_fetch" as const

const importCollections = (url: unknown, type: unknown) =>
  pipe(
    TE.Do,
    TE.bind("importer", () =>
      pipe(
        URLImporters,
        RA.findFirst(
          (importer) =>
            importer.applicableTo.includes("url-import") && importer.id === type
        ),
        TE.fromOption(() => IMPORTER_INVALID_TYPE)
      )
    ),
    TE.bindW("content", () =>
      pipe(
        url,
        TO.fromPredicate(isOfType("string")),
        TO.chain(fetchUrlData),
        TE.fromTaskOption(() => IMPORTER_INVALID_FETCH)
      )
    ),
    TE.chainW(({ importer, content }) =>
      pipe(
        content.data,
        TO.fromPredicate(isOfType("string")),
        TE.fromTaskOption(() => IMPORTER_INVALID_FILE_FORMAT),
        TE.chain((data) => importer.importer([data]))
      )
    )
  )

onMounted(async () => {
  const { query } = route.value

  const url = query.url
  const type = query.type

  const result = await importCollections(url, type)()

  pipe(result, E.fold(handleImportFailure, handleImportSuccess))

  router.replace("/")
})

const handleImportFailure = (error: string) => {
  const IMPORT_ERROR_MAP: Record<
    TELeftType<ReturnType<typeof importCollections>>,
    string
  > = {
    [IMPORTER_INVALID_TYPE]: "import.import_from_url_invalid_type",
    [IMPORTER_INVALID_FETCH]: "import.import_from_url_invalid_fetch",
    [IMPORTER_INVALID_FILE_FORMAT]:
      "import.import_from_url_invalid_file_format",
    [OPENAPI_DEREF_ERROR]: "import.import_from_url_invalid_file_format",
  }

  const isValidErrorMessage = (
    error: string
  ): error is keyof typeof IMPORT_ERROR_MAP =>
    Object.keys(IMPORT_ERROR_MAP).includes(error)

  if (isValidErrorMessage(error)) {
    toast.error(t(IMPORT_ERROR_MAP[error]).toString())
  } else {
    toast.error(t("import.import_from_url_failure").toString())
  }

  console.error(error)
}

const handleImportSuccess = (
  collections: HoppCollection<HoppRESTRequest>[]
) => {
  appendRESTCollections(collections)
  toast.success(t("import.import_from_url_success").toString())
}

const fetchUrlData = (url: string) =>
  TO.tryCatch(() =>
    axios.get(url, {
      responseType: "text",
      transitional: { forcedJSONParsing: false },
    })
  )
</script>
