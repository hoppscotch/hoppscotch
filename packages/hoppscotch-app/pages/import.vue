<script lang="ts">
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
import urlImporter from "~/helpers/import-export/import/url"
import { useToast, useI18n } from "~/helpers/utils/composables"

export default defineComponent({
  setup() {
    const route = useRoute()
    const router = useRouter()
    const toast = useToast()
    const t = useI18n()

    const { query } = route.value

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

    onMounted(async () => {
      if (typeof query.url === "string") {
        const result = await urlImporter.importer([query.url])()

        pipe(result, E.map(handleImportSuccess), E.mapLeft(handleImportFailure))
      }
      router.replace("/")
    })

    return () => {}
  },
})
</script>
