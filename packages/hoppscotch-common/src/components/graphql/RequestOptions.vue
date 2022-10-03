<template>
  <div class="flex flex-col flex-1 h-full">
    <HoppSmartTabs
      v-model="selectedOptionTab"
      styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperPrimaryStickyFold z-10"
      render-inactive-tabs
    >
      <HoppSmartTab
        :id="'query'"
        :label="`${t('tab.query')}`"
        :indicator="gqlQueryString && gqlQueryString.length > 0 ? true : false"
      >
        <div
          class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperSecondaryStickyFold gqlRunQuery"
        >
          <label class="font-semibold truncate text-secondaryLight">
            {{ t("request.query") }}
          </label>
          <div class="flex">
            <tippy
              v-if="operations.length > 1"
              ref="operationTippy"
              interactive
              trigger="click"
              theme="popover"
              placement="bottom"
              :on-shown="() => tippyActions.focus()"
            >
              <HoppButtonSecondary
                v-tippy="{
                  theme: 'tooltip',
                  delay: [500, 20],
                  allowHTML: true,
                }"
                :title="`${t(
                  'request.run'
                )} <xmp>${getSpecialKey()}</xmp><xmp>G</xmp>`"
                :label="`${t('request.run')}`"
                :icon="IconPlay"
                class="rounded-none !text-accent !hover:text-accentDark"
              />
              <template #content="{ hide }">
                <div ref="tippyActions" class="flex flex-col" role="menu">
                  <SmartItem
                    v-for="item in operations"
                    :key="`gql-operation-${item.name?.value}`"
                    :label="item?.name?.value"
                    @click="
                      () => {
                        runQuery(item)
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </tippy>

            <HoppButtonSecondary
              v-else
              v-tippy="{
                theme: 'tooltip',
                delay: [500, 20],
                allowHTML: true,
              }"
              :title="`${t(
                'request.run'
              )} <kbd>${getSpecialKey()}</kbd><kbd>↩</kbd>`"
              :label="`${t('request.run')}`"
              :icon="IconPlay"
              class="rounded-none !text-accent !hover:text-accentDark"
              @click="runQuery()"
            />

            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
              :title="`${t(
                'request.save'
              )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
              :label="`${t('request.save')}`"
              :icon="IconSave"
              class="rounded-none"
              @click="saveRequest"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/documentation/features/graphql-api-testing"
              blank
              :title="t('app.wiki')"
              :icon="IconHelpCircle"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :icon="IconTrash2"
              @click="clearGQLQuery()"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('state.linewrap')"
              :class="{ '!text-accent': linewrapEnabledQuery }"
              :icon="IconWrapText"
              @click.prevent="linewrapEnabledQuery = !linewrapEnabledQuery"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.prettify')"
              :icon="prettifyQueryIcon"
              @click="prettifyQuery"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.copy')"
              :icon="copyQueryIcon"
              @click="copyQuery"
            />
          </div>
        </div>
        <div ref="queryEditor" class="flex flex-col flex-1"></div>
      </HoppSmartTab>
      <HoppSmartTab
        :id="'variables'"
        :label="`${t('tab.variables')}`"
        :indicator="variableString && variableString.length > 0 ? true : false"
      >
        <div
          class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
        >
          <label class="font-semibold truncate text-secondaryLight">
            {{ t("request.variables") }}
          </label>
          <div class="flex">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/documentation/features/graphql-api-testing"
              blank
              :title="t('app.wiki')"
              :icon="IconHelpCircle"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :icon="IconTrash2"
              @click="clearGQLVariables()"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('state.linewrap')"
              :class="{ '!text-accent': linewrapEnabledVariable }"
              :icon="IconWrapText"
              @click.prevent="
                linewrapEnabledVariable = !linewrapEnabledVariable
              "
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.prettify')"
              :icon="prettifyVariablesIcon"
              @click="prettifyVariableString"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.copy')"
              :icon="copyVariablesIcon"
              @click="copyVariables"
            />
          </div>
        </div>
        <div ref="variableEditor" class="flex flex-col flex-1"></div>
      </HoppSmartTab>
      <HoppSmartTab
        :id="'headers'"
        :label="`${t('tab.headers')}`"
        :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
      >
        <GraphqlHeaders />
      </SmartTab>
      <SmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
        <GraphqlAuthorization />
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
import { Ref, computed, ref, onMounted } from "vue"
import * as gql from "graphql"
import { GQLHeader } from "@hoppscotch/data"
import { clone } from "lodash-es"
import {
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
} from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import {
  gqlAuth$,
  gqlHeaders$,
  gqlQuery$,
  gqlResponse$,
  gqlURL$,
  gqlVariables$,
  setGQLAuth,
  setGQLHeaders,
  setGQLQuery,
  setGQLResponse,
  setGQLVariables,
} from "~/newstore/GQLSession"
import { GQLConnection } from "~/helpers/GQLConnection"
import { makeGQLHistoryEntry, addGraphqlHistoryEntry } from "~/newstore/history"
import { platform } from "~/platform"
import { getCurrentStrategyID } from "~/helpers/network"
import { defineActionHandler } from "~/helpers/actions"

type OptionTabs = "query" | "headers" | "variables" | "authorization"

const selectedOptionTab = ref<OptionTabs>("query")

const t = useI18n()

const props = defineProps<{
  conn: GQLConnection
}>()

const toast = useToast()
const { subscribeToStream } = useStreamSubscriber()

const url = useReadonlyStream(gqlURL$, "")
const gqlQueryString = useStream(gqlQuery$, "", setGQLQuery)
const variableString = useStream(gqlVariables$, "", setGQLVariables)

// The functional headers list (the headers actually in the system)
const headers = useStream(gqlHeaders$, [], setGQLHeaders) as Ref<GQLHeader[]>

const auth = useStream(
  gqlAuth$,
  { authType: "none", authActive: true },
  setGQLAuth
)

const activeGQLHeadersCount = computed(
  () =>
    headers.value.filter((x) => x.active && (x.key !== "" || x.value !== ""))
      .length
)

const showSaveRequestModal = ref(false)

const response = useStream(gqlResponse$, "", setGQLResponse)

const runQuery = async (
  definition: gql.OperationDefinitionNode | null = null
) => {
  const startTime = Date.now()

  startPageProgress()
  response.value = "loading"

  try {
    const runURL = clone(url.value)
    const runHeaders = clone(headers.value)
    const runQuery = clone(gqlQueryString.value)
    const runVariables = clone(variableString.value)
    const runAuth = clone(auth.value)

    console.log(definition)

    await props.conn.runQuery({
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
    response.value = `${e}`
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
    strategy: getCurrentStrategyID(),
  })
}

onMounted(() => {
  subscribeToStream(props.conn.event$, (event) => {
    console.log(event)
    const { data } = event
    console.log(JSON.parse(data))
    try {
      response.value = JSON.stringify(JSON.parse(data), null, 2)
    } catch (error) {
      console.log(error)
    }
  })
})

const hideRequestModal = () => {
  showSaveRequestModal.value = false
}

const saveRequest = () => {
  showSaveRequestModal.value = true
}

const clearGQLQuery = () => {
  gqlQueryString.value = ""
}

defineActionHandler("request.send-cancel", runQuery)
defineActionHandler("request.save", saveRequest)
defineActionHandler("request.reset", clearGQLQuery)
</script>
