<template>
  <div class="flex flex-col justify-center h-screen">
    <div
      v-if="sharedRequestDetails.loading"
      class="flex justify-center items-center py-5"
    >
      <HoppSmartSpinner />
    </div>

    <div
      v-else-if="E.isLeft(sharedRequestDetails.data) || invalidLink"
      class="flex flex-1 flex-col items-center justify-center p-8"
    >
      <icon-lucide-alert-triangle class="svg-icons mb-2 opacity-75" />
      <h1 class="heading text-center">
        {{ t("error.invalid_link") }}
      </h1>
      <p class="mt-2 text-center">
        {{ t("error.invalid_embed_link") }}
      </p>
    </div>

    <Embeds
      v-else-if="protocol === 'rest' && restTab"
      v-model:model-tab="restTab"
      :properties="properties"
      :shared-request-i-d="sharedRequestID"
    />

    <EmbedsGQLIndex
      v-else-if="protocol === 'gql' && gqlTab"
      v-model:model-tab="gqlTab"
      :properties="properties"
      :shared-request-i-d="sharedRequestID"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useGQLQuery } from "~/composables/graphql"
import {
  ResolveShortcodeDocument,
  ResolveShortcodeQuery,
  ResolveShortcodeQueryVariables,
} from "~/helpers/backend/graphql"
import * as E from "fp-ts/Either"
import {
  getDefaultRESTRequest,
  makeGQLRequest,
  safelyExtractRESTRequest,
} from "@hoppscotch/data"
import { HoppTab } from "~/services/tab"
import {
  HoppGQLRequestDocument,
  HoppRequestDocument,
} from "~/helpers/rest/document"
import { applySetting } from "~/newstore/settings"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const route = useRoute()

const sharedRequestID = ref("")
const invalidLink = ref(false)
const properties = ref<string[]>([])

// Discriminator for which embed shell to render. Set when the shortcode
// payload is parsed; null until then (loading state).
const protocol = ref<"rest" | "gql" | null>(null)

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

// Tab ids unique per page mount so two embeds opened back-to-back via SPA
// navigation don't share connection-service state (the GQL connection
// service keys schema/socket/subscription by tabId). `crypto.randomUUID`
// is available in all evergreen browsers and the desktop renderer.
const embedTabId = `embed-${crypto.randomUUID()}`

// One tab ref per protocol so each child component gets a tightly-typed
// model and we don't need to widen the embed components themselves.
const restTab = ref<HoppTab<HoppRequestDocument>>({
  id: embedTabId,
  document: {
    request: getDefaultRESTRequest(),
    response: null,
    isDirty: false,
    type: "request",
  },
})

const gqlTab = ref<HoppTab<HoppGQLRequestDocument>>({
  id: embedTabId,
  document: {
    request: makeGQLRequest({
      name: "Untitled Request",
      url: "",
      headers: [],
      query: "",
      variables: "",
      auth: { authType: "none", authActive: true },
      description: null,
      responses: {},
    }),
    response: null,
    isDirty: false,
    type: "gql-request",
  },
})

const isGQLShortcodePayload = (req: unknown): boolean =>
  !!req &&
  typeof req === "object" &&
  "query" in req &&
  "url" in req &&
  !("endpoint" in req)

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

      if (isGQLShortcodePayload(request)) {
        const gql = request as Record<string, unknown>
        gqlTab.value.document.request = makeGQLRequest({
          name: typeof gql.name === "string" ? gql.name : "Untitled Request",
          url: typeof gql.url === "string" ? gql.url : "",
          headers: Array.isArray(gql.headers) ? (gql.headers as never) : [],
          query: typeof gql.query === "string" ? gql.query : "",
          variables: typeof gql.variables === "string" ? gql.variables : "",
          auth:
            gql.auth && typeof gql.auth === "object" && "authType" in gql.auth
              ? (gql.auth as never)
              : { authType: "none", authActive: true },
          description:
            typeof gql.description === "string" ? gql.description : null,
          responses: {},
        })
        protocol.value = "gql"
      } else {
        restTab.value.document.request = safelyExtractRESTRequest(
          request,
          getDefaultRESTRequest()
        )
        protocol.value = "rest"
      }

      if (data.right.shortcode && data.right.shortcode.properties) {
        const parsedProperties = JSON.parse(data.right.shortcode.properties)
        if (parsedProperties.theme === "dark") {
          applySetting("BG_COLOR", "dark")
        } else if (parsedProperties.theme === "light") {
          applySetting("BG_COLOR", "light")
        } else if (parsedProperties.theme === "system") {
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
