<template>
  <div></div>
</template>

<script setup lang="ts">
import axios from "axios"
import * as TO from "fp-ts/TaskOption"
import * as TE from "fp-ts/TaskEither"
import * as RA from "fp-ts/ReadonlyArray"

import { onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { HoppCollection } from "@hoppscotch/data"
import { appendRESTCollections } from "~/newstore/collections"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { IMPORTER_INVALID_FILE_FORMAT } from "~/helpers/import-export/import"
import { OPENAPI_DEREF_ERROR } from "~/helpers/import-export/import/openapi"
import { isOfType } from "~/helpers/functional/primtive"
import { TELeftType } from "~/helpers/functional/taskEither"

import {
  hoppRESTImporter,
  hoppPostmanImporter,
  hoppInsomniaImporter,
  hoppOpenAPIImporter,
} from "~/helpers/import-export/import/importers"

const route = useRoute()
const router = useRouter()
const toast = useToast()
const t = useI18n()

const IMPORTER_INVALID_TYPE = "importer_invalid_type" as const
const IMPORTER_INVALID_FETCH = "importer_invalid_fetch" as const

// TODO: move this to importers after moving the importer metadatas from respective components to imports/*.ts file
const URLImporters = [
  {
    id: "hoppscotch",
    importer: hoppRESTImporter,
  },
  {
    id: "postman",
    importer: hoppPostmanImporter,
  },
  {
    id: "insomnia",
    importer: hoppInsomniaImporter,
  },
  {
    id: "openapi",
    importer: hoppOpenAPIImporter,
  },
]

const importCollections = (url: unknown, type: unknown) =>
  pipe(
    TE.Do,
    TE.bind("importer", () =>
      pipe(
        URLImporters,
        RA.findFirst((importer) => importer.id === type),
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

type ImportCollectionsError = TELeftType<ReturnType<typeof importCollections>>

onMounted(async () => {
  const { query } = route

  const url = query.url
  const type = query.type

  const result = await importCollections(url, type)()

  pipe(result, E.fold(handleImportFailure, handleImportSuccess))

  router.replace("/")
})

const IMPORT_ERROR_MAP: Record<ImportCollectionsError, string> = {
  [IMPORTER_INVALID_TYPE]: "import.import_from_url_invalid_type",
  [IMPORTER_INVALID_FETCH]: "import.import_from_url_invalid_fetch",
  [IMPORTER_INVALID_FILE_FORMAT]: "import.import_from_url_invalid_file_format",
  [OPENAPI_DEREF_ERROR]: "import.import_from_url_invalid_file_format",
} as const

const handleImportFailure = (error: ImportCollectionsError) => {
  toast.error(t(IMPORT_ERROR_MAP[error]).toString())
}

const handleImportSuccess = (collections: HoppCollection[]) => {
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
