<template>
  <div class="flex flex-col flex-1 h-full">
    <HoppSmartTabs
      v-model="selectedOptionTab"
      styles="sticky top-0 bg-primary z-10 border-b-0"
      :render-inactive-tabs="true"
    >
      <HoppSmartTab
        :id="'query'"
        :label="`${t('tab.query')}`"
        :indicator="request.query && request.query.length > 0 ? true : false"
      >
        <GraphqlQuery
          v-model="request.query"
          @run-query="runQuery"
          @save-request="saveRequest"
        />
      </HoppSmartTab>
      <HoppSmartTab
        :id="'variables'"
        :label="`${t('tab.variables')}`"
        :indicator="
          request.variables && request.variables.length > 0 ? true : false
        "
      >
        <GraphqlVariable
          v-model="request.variables"
          @run-query="runQuery"
          @save-request="saveRequest"
        />
      </HoppSmartTab>
      <HoppSmartTab
        :id="'headers'"
        :label="`${t('tab.headers')}`"
        :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
      >
        <GraphqlHeaders v-model="request" />
      </HoppSmartTab>
      <HoppSmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
        <GraphqlAuthorization v-model="request.auth" />
      </HoppSmartTab>
    </HoppSmartTabs>
    <CollectionsSaveRequest
      mode="graphql"
      :show="showSaveRequestModal"
      @hide-modal="hideRequestModal"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { completePageProgress, startPageProgress } from "@modules/loadingbar"
import * as gql from "graphql"
import { clone } from "lodash-es"
import { computed, ref, watch } from "vue"
import { defineActionHandler } from "~/helpers/actions"
import { HoppGQLRequest } from "@hoppscotch/data"
import { platform } from "~/platform"
import { currentActiveTab } from "~/helpers/graphql/tab"
import { computedWithControl } from "@vueuse/core"
import {
  GQLResponseEvent,
  runGQLOperation,
  gqlMessageEvent,
} from "~/helpers/graphql/connection"
import { useService } from "dioc/vue"
import { InterceptorService } from "~/services/interceptor.service"
import { editGraphqlRequest } from "~/newstore/collections"

export type GQLOptionTabs = "query" | "headers" | "variables" | "authorization"
const selectedOptionTab = ref<GQLOptionTabs>("query")
const interceptorService = useService(InterceptorService)

const t = useI18n()
const toast = useToast()

// v-model integration with props and emit
const props = withDefaults(
  defineProps<{
    modelValue: HoppGQLRequest
    response?: GQLResponseEvent[] | null
    tabId: string
  }>(),
  {
    response: null,
  }
)
const emit = defineEmits(["update:modelValue", "update:response"])

const request = ref(props.modelValue)

watch(
  () => request.value,
  (newVal) => {
    emit("update:modelValue", newVal)
  },
  { deep: true }
)

const url = computedWithControl(
  () => currentActiveTab.value,
  () => currentActiveTab.value.document.request.url
)

const activeGQLHeadersCount = computed(
  () =>
    request.value.headers.filter(
      (x) => x.active && (x.key !== "" || x.value !== "")
    ).length
)
const showSaveRequestModal = ref(false)
const runQuery = async (
  definition: gql.OperationDefinitionNode | null = null
) => {
  const startTime = Date.now()
  startPageProgress()
  try {
    const runURL = clone(url.value)
    const runHeaders = clone(request.value.headers)
    const runQuery = clone(request.value.query)
    const runVariables = clone(request.value.variables)
    const runAuth = clone(request.value.auth)

    await runGQLOperation({
      name: request.value.name,
      url: runURL,
      headers: runHeaders,
      query: runQuery,
      variables: runVariables,
      auth: runAuth,
      operationName: definition?.name?.value,
      operationType: definition?.operation ?? "query",
    })
    const duration = Date.now() - startTime
    completePageProgress()
    toast.success(`${t("state.finished_in", { duration })}`)
  } catch (e: any) {
    console.log(e)
    // response.value = [`${e}`]
    completePageProgress()
    toast.error(
      `${t("error.something_went_wrong")}. ${t("error.check_console_details")}`,
      {}
    )
    console.error(e)
  }
  platform.analytics?.logEvent({
    type: "HOPP_REQUEST_RUN",
    platform: "graphql-query",
    strategy: interceptorService.currentInterceptorID.value!,
  })
}

watch(
  () => gqlMessageEvent.value,
  (event) => {
    if (event === "reset") {
      emit("update:response", [])
      return
    }

    try {
      if (event?.operationType !== "subscription") {
        // response.value = [event]
        emit("update:response", [event])
      } else {
        emit("update:response", [...(props.response ?? []), event])

        // TODO: subscription indicator??
      }
    } catch (error) {
      console.log(error)
    }
  },
  { deep: true }
)

const hideRequestModal = () => {
  showSaveRequestModal.value = false
}
const saveRequest = () => {
  if (
    currentActiveTab.value.document.saveContext &&
    currentActiveTab.value.document.saveContext.originLocation ===
      "user-collection"
  ) {
    editGraphqlRequest(
      currentActiveTab.value.document.saveContext.folderPath,
      currentActiveTab.value.document.saveContext.requestIndex,
      currentActiveTab.value.document.request
    )

    currentActiveTab.value.document.isDirty = false
  } else {
    showSaveRequestModal.value = true
  }
}
const clearGQLQuery = () => {
  request.value.query = ""
}
defineActionHandler("request.send-cancel", runQuery)
defineActionHandler("request.save", saveRequest)
defineActionHandler("request.save-as", () => {
  showSaveRequestModal.value = true
})
defineActionHandler("request.reset", clearGQLQuery)

defineActionHandler("request.open-tab", ({ tab }) => {
  selectedOptionTab.value = tab as GQLOptionTabs
})
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperPrimaryStickyFold #{!important};
}
</style>
