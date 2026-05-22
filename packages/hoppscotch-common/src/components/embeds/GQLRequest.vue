<template>
  <div class="sticky top-0 z-10">
    <div
      class="flex-none flex-shrink-0 p-4 bg-primary sm:flex sm:flex-shrink-0 sm:space-x-2"
    >
      <div
        class="flex flex-1 overflow-hidden border divide-x rounded text-secondaryDark divide-divider min-w-[12rem] overflow-x-auto border-divider"
      >
        <span
          class="flex items-center justify-center px-4 py-2 font-semibold transition rounded-l text-accent"
        >
          <component :is="IconGraphql" class="h-4 w-4" />
        </span>
        <div
          class="flex items-center flex-1 flex-shrink-0 min-w-0 truncate rounded-r"
        >
          <SmartEnvInput v-model="tab.document.request.url" :readonly="true" />
        </div>
      </div>
      <div class="flex mt-2 space-x-2 sm:mt-0">
        <HoppButtonPrimary
          id="run"
          :title="`${t('request.run')} <kbd>${getSpecialKey()}</kbd><kbd>↩</kbd>`"
          :label="`${
            subscriptionState === 'SUBSCRIBED'
              ? t('request.stop')
              : t('request.run')
          }`"
          class="flex-1 min-w-20"
          outline
          @click="subscriptionState === 'SUBSCRIBED' ? stopQuery() : runQuery()"
        />
        <div class="flex">
          <HoppButtonSecondary
            :title="`${t(
              'request.save'
            )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
            :label="t('request.save')"
            filled
            :icon="IconSave"
            class="flex-1 rounded"
            blank
            outline
            :to="sharedRequestURL"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import IconSave from "~icons/lucide/save"
import IconGraphql from "~icons/hopp/graphql"
import { computed, useModel } from "vue"
import { useI18n } from "~/composables/i18n"
import { useService } from "dioc/vue"
import { GQLTabConnectionService } from "~/services/gql-tab-connection.service"
import { HoppTab } from "~/services/tab"
import { HoppGQLRequestDocument } from "~/helpers/rest/document"
import { parse } from "graphql"
import type { OperationDefinitionNode } from "graphql"

const t = useI18n()

const props = defineProps<{
  modelTab: HoppTab<HoppGQLRequestDocument>
  sharedRequestURL: string
}>()

const tab = useModel(props, "modelTab")

const gqlTabConn = useService(GQLTabConnectionService)

// Reactive subscription state for the live tab — flips the Run/Stop label
// based on whether the user has an active subscription open.
const subscriptionState = computed(
  () => gqlTabConn.getTabSubscriptionState(tab.value.id).value
)

// Pull the first operation definition out of the query so a Run click
// matches the workspace behaviour (which always knows what operation to
// run). The shortcode's stored query is canonical, so this is a parse on
// every Run rather than a per-keystroke parse.
const firstOperation = (): OperationDefinitionNode | null => {
  try {
    const ast = parse(tab.value.document.request.query)
    return (
      (ast.definitions.find((d) => d.kind === "OperationDefinition") as
        | OperationDefinitionNode
        | undefined) ?? null
    )
  } catch {
    return null
  }
}

const runQuery = async () => {
  const op = firstOperation()
  try {
    await gqlTabConn.runTabGQLOperation(tab.value.id, {
      name: tab.value.document.request.name,
      url: tab.value.document.request.url,
      request: tab.value.document.request,
      inheritedHeaders: [],
      query: tab.value.document.request.query,
      variables: tab.value.document.request.variables,
      operationName: op?.name?.value,
      operationType: op?.operation ?? "query",
    })
  } catch (_e) {
    // Connection service routes the error onto the response stream; no
    // additional UI work needed here.
  }
}

const stopQuery = () => {
  gqlTabConn.unsubscribeTab(tab.value.id)
}
</script>
