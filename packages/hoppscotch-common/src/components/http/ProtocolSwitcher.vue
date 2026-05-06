<template>
  <div
    class="sticky top-0 z-20 flex items-center border-b border-dividerLight bg-primary px-4 py-2"
  >
    <div>
      <tippy
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => protocolTippyActions?.focus()"
      >
        <HoppSmartSelectWrapper>
          <button
            class="flex items-center gap-1.5 rounded bg-primaryLight px-3 py-1 text-tiny font-bold uppercase tracking-wide text-secondaryDark transition hover:bg-primaryDark"
          >
            <component :is="currentProtocolIcon" class="h-3.5 w-3.5" />
            {{ currentProtocolLabel }}
            <component
              :is="IconChevronDown"
              class="h-3.5 w-3.5 text-secondaryLight"
            />
          </button>
        </HoppSmartSelectWrapper>
        <template #content="{ hide }">
          <div
            ref="protocolTippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <HoppSmartItem
              label="REST"
              :icon="IconGlobe"
              :active="isREST"
              @click="
                () => {
                  switchToREST()
                  hide()
                }
              "
            />
            <HoppSmartItem
              label="GraphQL"
              :icon="IconGraphql"
              :active="isGQL"
              @click="
                () => {
                  switchToGQL()
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
    </div>

    <!-- Folder path + editable request name -->
    <div class="ml-4 flex min-w-0 items-center">
      <template v-if="folderPath.length > 0">
        <template v-for="(segment, i) in folderPath" :key="i">
          <span class="flex-shrink-0 truncate text-tiny text-secondaryLight">
            {{ segment }}
          </span>
          <component
            :is="IconChevronRight"
            class="mx-0.5 h-3 w-3 flex-shrink-0 text-secondaryLight opacity-50"
          />
        </template>
      </template>
      <HoppSmartInput
        v-model="requestName"
        :autofocus="false"
        styles=""
        input-styles="border border-transparent bg-transparent text-tiny text-secondaryDark focus:border-divider focus:bg-primaryLight rounded px-2 py-0.5 outline-none transition-colors"
        placeholder="Untitled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useService } from "dioc/vue"
import { useReadonlyStream } from "@composables/stream"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import {
  convertRESTToGQL,
  convertGQLToREST,
} from "~/helpers/rest/type-converter"
import {
  HoppRequestDocument,
  HoppGQLRequestDocument,
} from "~/helpers/rest/document"
import { restCollections$ } from "~/newstore/collections"
import IconChevronRight from "~icons/lucide/chevron-right"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconGlobe from "~icons/lucide/globe"
import IconGraphql from "~icons/hopp/graphql"

const tabs = useService(WorkspaceTabsService)

const protocolTippyActions = ref<HTMLDivElement | null>(null)

const collections = useReadonlyStream(restCollections$, [])

const currentDoc = computed(() => tabs.currentActiveTab.value?.document)

const isREST = computed(() => currentDoc.value?.type === "request")
const isGQL = computed(() => currentDoc.value?.type === "gql-request")

const currentProtocolLabel = computed(() => (isGQL.value ? "GraphQL" : "REST"))

const currentProtocolIcon = computed(() =>
  isGQL.value ? IconGraphql : IconGlobe
)

const requestName = computed({
  get: () => {
    const doc = currentDoc.value
    if (!doc) return ""
    if (doc.type === "request") return doc.request.name
    if (doc.type === "gql-request") return doc.request.name
    return ""
  },
  set: (value: string) => {
    const doc = currentDoc.value
    if (!doc) return
    if (doc.type === "request") {
      doc.request.name = value
    } else if (doc.type === "gql-request") {
      doc.request.name = value
    }
  },
})

const folderPath = computed<string[]>(() => {
  const doc = currentDoc.value
  if (!doc) return []

  const saveContext =
    doc.type === "request" || doc.type === "gql-request"
      ? doc.saveContext
      : null

  if (
    !saveContext ||
    saveContext.originLocation !== "user-collection" ||
    !saveContext.folderPath
  ) {
    return []
  }

  const indexPath = saveContext.folderPath
  const indexes = indexPath.split("/").map((x) => parseInt(x))

  // Walk the collection tree collecting names
  const names: string[] = []
  const cols = collections.value

  if (indexes.length === 0 || !cols.length) return []

  // First index is the root collection
  let current = cols[indexes[0]]
  if (!current) return []
  names.push(current.name)

  // Subsequent indexes traverse into folders
  for (let i = 1; i < indexes.length; i++) {
    const folder = current.folders[indexes[i]]
    if (!folder) break
    names.push(folder.name)
    current = folder
  }

  return names
})

const switchToGQL = () => {
  if (!isREST.value) return
  const tab = tabs.currentActiveTab.value
  if (!tab || tab.document.type !== "request") return

  // Snapshot the current REST request as the REST draft so a later switch back
  // restores edits the user made before this protocol switch.
  tabs.setProtocolDraft(tab.id, "rest", tab.document.request)

  // If the user previously had GQL data on this tab, restore it verbatim.
  // Otherwise let the converter seed a fresh GQL request from the REST one.
  const gqlDraft = tabs.getProtocolDraft(tab.id)?.gql

  const gqlDoc = convertRESTToGQL(tab.document as HoppRequestDocument, gqlDraft)
  tab.document = gqlDoc
  tabs.updateTab(tab)
}

const switchToREST = () => {
  if (!isGQL.value) return
  const tab = tabs.currentActiveTab.value
  if (!tab || tab.document.type !== "gql-request") return

  // Snapshot the current GQL request as the GQL draft for round-trip preservation.
  tabs.setProtocolDraft(tab.id, "gql", tab.document.request)

  // Restore the previously-snapshotted REST request if any; else seed from GQL.
  const restDraft = tabs.getProtocolDraft(tab.id)?.rest

  const restDoc = convertGQLToREST(
    tab.document as HoppGQLRequestDocument,
    restDraft
  )
  tab.document = restDoc
  tabs.updateTab(tab)
}
</script>
