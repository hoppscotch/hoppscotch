<script lang="ts">
import axios from "axios"
import * as TO from "fp-ts/TaskOption"
import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"

import {
  useRoute,
  useRouter,
  onMounted,
  defineComponent,
} from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import { appendRESTCollections } from "~/newstore/collections"
import { useToast, useI18n } from "~/helpers/utils/composables"
import { RESTCollectionImporters } from "~/helpers/import-export/import/importers"
import { IMPORTER_INVALID_FILE_FORMAT } from "~/helpers/import-export/import"

export default defineComponent({
  setup() {
    const route = useRoute()
    const router = useRouter()
    const toast = useToast()
    const t = useI18n()

    onMounted(() => {
      const supportedImporters = RESTCollectionImporters.filter(
        (importer) =>
          importer.applicableTo?.includes("url-import") ||
          !importer.applicableTo
      )

      const { query } = route.value

      const url = query.url
      const type = query.type

      // TODO: use bind and remove nested pipes
      const importCollections = pipe(
        isValidParams([url, type]),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        O.chain(([url, type]) =>
          pipe(
            supportedImporters,
            A.findFirst((importer: { id: string }) => importer.id === type)
          )
        ),
        TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT),
        TE.chain((importer) =>
          pipe(
            url as string,
            fetchUrlData,
            TE.fromTaskOption(() => IMPORTER_INVALID_FILE_FORMAT),
            TE.chain((res) =>
              importer.importer([JSON.stringify(res.data)] as any)
            )
          )
        )
      )

      importCollections()
        .then(E.fold(handleImportFailure, handleImportSuccess))
        .then(() => router.replace("/"))
    })

    const handleImportFailure = (error: string) => {
      toast.error(t("import.import_from_url_failure").toString())
      console.error(error)
    }

    const handleImportSuccess = (
      collections: HoppCollection<HoppRESTRequest>[]
    ) => {
      appendRESTCollections(collections)
      toast.success(t("import.import_from_url_success").toString())
    }

    const isValidParams = O.fromPredicate(
      (args: [unknown, unknown]): args is [string, string] =>
        typeof args[0] === "string" && typeof args[1] === "string"
    )

    const fetchUrlData = (url: string) => TO.tryCatch(() => axios.get(url))

    return () => {}
  },
})
</script>
