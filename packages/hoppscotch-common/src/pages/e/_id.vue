<template>
  <div class="flex flex-col flex-1 w-full">
    <Embeds
      v-if="tab"
      v-model:modelTab="tab"
      :properties="properties"
      :shared-request-i-d="sharedRequestID"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { watch } from "vue"
import { useRoute } from "vue-router"
import { useGQLQuery } from "~/composables/graphql"
import {
  ResolveShortcodeDocument,
  ResolveShortcodeQuery,
  ResolveShortcodeQueryVariables,
} from "~/helpers/backend/graphql"
import * as E from "fp-ts/Either"
import { onMounted } from "vue"
import {
  getDefaultRESTRequest,
  safelyExtractRESTRequest,
} from "@hoppscotch/data"
import { HoppTab } from "~/services/tab"
import { HoppRESTDocument } from "~/helpers/rest/document"
import { applySetting } from "~/newstore/settings"

const route = useRoute()

const sharedRequestID = ref("")
const invalidLink = ref(false)
const properties = ref([])

const sharedRequestDetails = useGQLQuery<
  ResolveShortcodeQuery,
  ResolveShortcodeQueryVariables,
  ""
>({
  query: ResolveShortcodeDocument,
  variables: {
    code: route.params.id.toString(),
  },
})

const tab = ref<HoppTab<HoppRESTDocument>>({
  id: "0",
  document: {
    request: getDefaultRESTRequest(),
    response: null,
    isDirty: false,
  },
})

watch(
  () => sharedRequestDetails.data,
  () => {
    if (sharedRequestDetails.loading) return

    const data = sharedRequestDetails.data

    if (E.isRight(data)) {
      if (!data.right.shortcode?.request) {
        invalidLink.value = true
        return
      }

      const request: unknown = JSON.parse(
        data.right.shortcode?.request as string
      )

      tab.value.document.request = safelyExtractRESTRequest(
        request,
        getDefaultRESTRequest()
      )

      if (data.right.shortcode && data.right.shortcode.properties) {
        const parsedProperties = JSON.parse(data.right.shortcode.properties)
        if (parsedProperties.theme === "dark") {
          applySetting("BG_COLOR", "dark")
        } else if (parsedProperties.theme === "light") {
          applySetting("BG_COLOR", "light")
        } else if (parsedProperties.theme === "auto") {
          applySetting("BG_COLOR", "system")
        }
        properties.value = parsedProperties.options
      }
    }
  }
)

onMounted(() => {
  if (typeof route.params.id === "string") {
    sharedRequestID.value = route.params.id
    sharedRequestDetails.execute()
  }
  invalidLink.value = !sharedRequestID.value
})
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
