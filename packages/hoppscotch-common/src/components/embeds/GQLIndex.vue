<template>
  <component
    :is="platform.ui?.additionalEmbedsComponent"
    v-if="showCustomEmbedsView"
    v-bind="props"
  />

  <AppPaneLayout v-else layout-id="embed-primary" :is-embed="true">
    <template #primary>
      <EmbedsHeader :shared-request-u-r-l="sharedRequestURL" />
      <div class="flex flex-col flex-1">
        <EmbedsGQLRequest
          :model-tab="modelTab"
          :shared-request-u-r-l="sharedRequestURL"
        />
        <div class="flex flex-col flex-1">
          <GqlRequestOptions
            v-model="tab.document.request"
            v-model:option-tab="selectedOptionTab"
            :tab-id="tab.id"
            :url="tab.document.request.url"
            :response="tab.document.response"
            :show-run-actions="false"
            :properties="properties"
            @update:response="onResponseUpdate"
          />
        </div>
      </div>
    </template>
    <template #secondary>
      <GqlResponse
        v-model:document="tab.document"
        :tab-id="tab.id"
        :response="tab.document.response ?? null"
      />
    </template>
  </AppPaneLayout>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, useModel } from "vue"
import { useService } from "dioc/vue"
import { HoppTab } from "~/services/tab"
import { HoppGQLRequestDocument } from "~/helpers/rest/document"
import { platform } from "~/platform"
import type { GQLOptionTabs } from "~/components/graphql/RequestOptions.vue"
import {
  GQLTabConnectionService,
  type GQLResponseEvent,
} from "~/services/gql-tab-connection.service"

// Mirrors components/embeds/index.vue but mounts the GraphQL component
// tree — GqlRequestOptions for the four-tab editor, gql/Response for the
// response/subscription log. Stays separate from the REST shell so neither
// tree carries protocol-specific branching internally.
const props = defineProps<{
  modelTab: HoppTab<HoppGQLRequestDocument>
  properties: string[]
  sharedRequestID: string
}>()

const tab = useModel(props, "modelTab")

const gqlTabConn = useService(GQLTabConnectionService)

// Close the schema-poll socket and any live subscription when the embed
// iframe is unmounted (host navigation, route change). Without this the
// connection-service keeps the tab context — including a potentially open
// WebSocket — alive for the rest of the page session.
onBeforeUnmount(() => {
  gqlTabConn.cleanupTab(tab.value.id)
})

// Tracks which sub-tab (Query / Variables / Headers / Authorization) is
// currently visible. Owned locally by the embed shell so the tab strip is
// interactive without needing the share-er to pre-select one.
//
// Initialise from the first allowed tab (mirrors the REST embed shell): if the
// share-er hid `query`, defaulting to it would select a tab that
// `GqlRequestOptions` never renders, leaving a blank editor. An empty
// `properties` array means "show all" there, so fall back to `query`.
const selectedOptionTab = ref<GQLOptionTabs>(
  (props.properties[0] as GQLOptionTabs) ?? "query"
)

// `GqlRequestOptions` watches the per-tab message stream from the connection
// service and re-emits each event as `update:response`. The embed owns the
// document, so we fold these events back into `tab.document.response` —
// matching the workspace flow where the parent (http/RequestOptions or its
// pages parent) does the same.
const onResponseUpdate = (events: GQLResponseEvent[]) => {
  tab.value.document.response = events
}

const shortcodeBaseURL = computed(
  () => import.meta.env.VITE_SHORTCODE_BASE_URL ?? "https://hopp.sh"
)

const sharedRequestURL = computed(() => {
  return `${shortcodeBaseURL.value}/r/${props.sharedRequestID}`
})

const showCustomEmbedsView = computed(() => {
  const { organization, ui } = platform

  return (
    organization &&
    !organization.isDefaultCloudInstance &&
    ui?.additionalEmbedsComponent
  )
})
</script>
