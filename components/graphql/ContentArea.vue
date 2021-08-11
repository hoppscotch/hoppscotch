<template>
  <div>
    <SmartTabs styles="sticky top-upperPrimaryStickyFold z-10">
      <SmartTab :id="'query'" :label="$t('query')" :selected="true">
        <AppSection label="query">
          <div
            class="
              bg-primary
              border-b border-dividerLight
              flex flex-1
              top-upperSecondaryStickyFold
              pl-4
              z-10
              sticky
              items-center
              justify-between
              gqlRunQuery
            "
          >
            <label for="gqlQuery" class="font-semibold">
              {{ $t("query") }}
            </label>
            <div class="flex">
              <ButtonSecondary
                :label="$t('run')"
                :shortcut="[getSpecialKey(), 'Enter']"
                icon="play_arrow"
                class="!text-accent"
                @click.native="runQuery()"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.copy')"
                :icon="copyQueryIcon"
                @click.native="copyQuery"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="`${$t(
                  'prettify_query'
                )} <kbd>${getSpecialKey()}</kbd><kbd>P</kbd>`"
                :icon="prettifyQueryIcon"
                @click.native="prettifyQuery"
              />
              <ButtonSecondary
                ref="saveRequest"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('request.save')"
                icon="create_new_folder"
                @click.native="saveRequest"
              />
            </div>
          </div>
          <GraphqlQueryEditor
            ref="queryEditor"
            v-model="gqlQueryString"
            :on-run-g-q-l-query="runQuery"
            :options="{
              maxLines: Infinity,
              minLines: 16,
              fontSize: '12px',
              autoScrollEditorIntoView: true,
              showPrintMargin: false,
              useWorker: false,
            }"
            @update-query="updateQuery"
          />
        </AppSection>
      </SmartTab>

      <SmartTab :id="'variables'" :label="$t('variables')">
        <AppSection label="variables">
          <div
            class="
              bg-primary
              border-b border-dividerLight
              flex flex-1
              top-upperSecondaryStickyFold
              pl-4
              z-10
              sticky
              items-center
              justify-between
            "
          >
            <label class="font-semibold">
              {{ $t("variables") }}
            </label>
            <div class="flex">
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.copy')"
                :icon="copyVariablesIcon"
                @click.native="copyVariables"
              />
            </div>
          </div>
          <SmartAceEditor
            ref="variableEditor"
            v-model="variableString"
            :lang="'json'"
            :options="{
              maxLines: Infinity,
              minLines: 16,
              fontSize: '12px',
              autoScrollEditorIntoView: true,
              showPrintMargin: false,
              useWorker: false,
            }"
          />
        </AppSection>
      </SmartTab>

      <SmartTab :id="'headers'" :label="$t('headers')">
        <AppSection label="headers">
          <div
            class="
              bg-primary
              border-b border-dividerLight
              flex flex-1
              top-upperSecondaryStickyFold
              pl-4
              z-10
              sticky
              items-center
              justify-between
            "
          >
            <label class="font-semibold">
              {{ $t("headers") }}
            </label>
            <div class="flex">
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('clear')"
                icon="clear_all"
                @click.native="headers = []"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('add.new')"
                icon="add"
                @click.native="addRequestHeader"
              />
            </div>
          </div>
          <div
            v-for="(header, index) in headers"
            :key="`header-${index}`"
            class="
              divide-x divide-dividerLight
              border-b border-dividerLight
              flex
            "
            :class="{ 'border-t': index == 0 }"
          >
            <SmartAutoComplete
              :placeholder="$t('count.header', { count: index + 1 })"
              :source="commonHeaders"
              :spellcheck="false"
              :value="header.key"
              autofocus
              styles="
                        bg-primaryLight
                        flex
                        font-semibold font-mono
                        flex-1
                        py-2
                        px-4
                        focus:outline-none
                      "
              @input="
                updateGQLHeader(index, {
                  key: $event,
                  value: header.value,
                  active: header.active,
                })
              "
            />
            <input
              class="
                bg-primaryLight
                flex
                font-semibold font-mono
                w-full
                py-2
                px-4
                focus:outline-none
              "
              :placeholder="$t('count.value', { count: index + 1 })"
              :name="`value ${index}`"
              :value="header.value"
              autofocus
              @change="
                updateGQLHeader(index, {
                  key: header.key,
                  value: $event.target.value,
                  active: header.active,
                })
              "
            />
            <span>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="
                  header.hasOwnProperty('active')
                    ? header.active
                      ? $t('action.turn_off')
                      : $t('action.turn_on')
                    : $t('action.turn_off')
                "
                :icon="
                  header.hasOwnProperty('active')
                    ? header.active
                      ? 'check_box'
                      : 'check_box_outline_blank'
                    : 'check_box'
                "
                color="green"
                @click.native="
                  updateGQLHeader(index, {
                    key: header.key,
                    value: header.value,
                    active: !header.active,
                  })
                "
              />
            </span>
            <span>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('delete')"
                icon="delete"
                color="red"
                @click.native="removeRequestHeader(index)"
              />
            </span>
          </div>
          <div
            v-if="headers.length === 0"
            class="
              flex flex-col
              text-secondaryLight
              p-4
              items-center
              justify-center
            "
          >
            <i class="opacity-75 pb-2 material-icons">post_add</i>
            <span class="text-center pb-4">
              {{ $t("empty.headers") }}
            </span>
            <ButtonSecondary
              :label="$t('add.new')"
              outline
              @click.native="addRequestHeader"
            />
          </div>
        </AppSection>
      </SmartTab>
    </SmartTabs>

    <CollectionsSaveRequest
      mode="graphql"
      :show="showSaveRequestModal"
      :editing-request="editRequest"
      @hide-modal="hideRequestModal"
    />
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  PropType,
  ref,
  useContext,
  watch,
} from "@nuxtjs/composition-api"
import clone from "lodash/clone"
import { getPlatformSpecialKey } from "~/helpers/platformutils"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import {
  useNuxt,
  useReadonlyStream,
  useStream,
} from "~/helpers/utils/composables"
import {
  addGQLHeader,
  gqlHeaders$,
  gqlQuery$,
  gqlResponse$,
  gqlURL$,
  gqlVariables$,
  removeGQLHeader,
  setGQLHeaders,
  setGQLQuery,
  setGQLResponse,
  setGQLVariables,
  updateGQLHeader,
} from "~/newstore/GQLSession"
import { commonHeaders } from "~/helpers/headers"
import { GQLConnection } from "~/helpers/GQLConnection"
import { addGraphqlHistoryEntry } from "~/newstore/history"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { getCurrentStrategyID } from "~/helpers/network"

export default defineComponent({
  props: {
    conn: {
      type: Object as PropType<GQLConnection>,
      required: true,
    },
  },
  setup(props) {
    const {
      $toast,
      app: { i18n },
    } = useContext()
    const t = i18n.t.bind(i18n)
    const nuxt = useNuxt()

    const url = useReadonlyStream(gqlURL$, "")
    const gqlQueryString = useStream(gqlQuery$, "", setGQLQuery)
    const variableString = useStream(gqlVariables$, "", setGQLVariables)
    const headers = useStream(gqlHeaders$, [], setGQLHeaders)

    const queryEditor = ref<any | null>(null)

    const copyQueryIcon = ref("content_copy")
    const prettifyQueryIcon = ref("photo_filter")
    const copyVariablesIcon = ref("content_copy")

    const editRequest = ref({})
    const showSaveRequestModal = ref(false)

    const schema = useReadonlyStream(props.conn.schemaString$, "")
    watch(schema, () => {
      console.log(schema.value)
    })

    const copyQuery = () => {
      copyToClipboard(gqlQueryString.value)
      copyQueryIcon.value = "done"
      setTimeout(() => (copyQueryIcon.value = "content_copy"), 1000)
    }

    const response = useStream(gqlResponse$, "", setGQLResponse)

    const runQuery = async () => {
      const startTime = Date.now()

      nuxt.value.$loading.start()
      response.value = t("loading").toString()

      try {
        const runURL = clone(url.value)
        const runHeaders = clone(headers.value)
        const runQuery = clone(gqlQueryString.value)
        const runVariables = clone(variableString.value)

        const responseText = await props.conn.runQuery(
          runURL,
          runHeaders,
          runQuery,
          runVariables
        )
        const duration = Date.now() - startTime

        nuxt.value.$loading.finish()

        response.value = JSON.stringify(JSON.parse(responseText), null, 2)

        const historyEntry = {
          url: runURL,
          query: runQuery,
          variables: runVariables,
          star: false,
          headers: runHeaders,
          response: response.value,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          updatedOn: new Date(),
          duration,
        }

        addGraphqlHistoryEntry(historyEntry)

        $toast.success(t("finished_in", { duration }).toString(), {
          icon: "done",
        })
      } catch (error: any) {
        response.value = `${error}. ${t("check_console_details")}`
        nuxt.value.$loading.finish()

        $toast.error(`${error} ${t("f12_details").toString()}`, {
          icon: "error",
        })
        console.log("Error", error)
      }

      logHoppRequestRunToAnalytics({
        platform: "graphql-query",
        strategy: getCurrentStrategyID()
      })
    }

    const hideRequestModal = () => {
      editRequest.value = {}
      showSaveRequestModal.value = false
    }

    const prettifyQuery = () => {
      queryEditor.value.prettifyQuery()
      prettifyQueryIcon.value = "done"
      setTimeout(() => (prettifyQueryIcon.value = "photo_filter"), 1000)
    }

    const saveRequest = () => {
      // TODO: Make the modal get the data from the session state
      editRequest.value = {
        url: url.value,
        query: gqlQueryString.value,
        headers: headers.value,
        variables: variableString.value,
      }

      showSaveRequestModal.value = true
    }

    // Why ?
    const updateQuery = (updatedQuery: string) => {
      gqlQueryString.value = updatedQuery
    }

    const copyVariables = () => {
      copyToClipboard(variableString.value)
      copyVariablesIcon.value = "done"
      setTimeout(() => (copyVariablesIcon.value = "content_copy"), 1000)
    }

    const addRequestHeader = () => {
      addGQLHeader({
        key: "",
        value: "",
        active: true,
      })
    }

    const removeRequestHeader = (index: number) => {
      removeGQLHeader(index)
    }

    return {
      gqlQueryString,
      variableString,
      headers,
      copyQueryIcon,
      prettifyQueryIcon,
      copyVariablesIcon,

      queryEditor,

      editRequest,
      showSaveRequestModal,
      hideRequestModal,

      schema,

      copyQuery,
      runQuery,
      prettifyQuery,
      saveRequest,
      updateQuery,
      copyVariables,
      addRequestHeader,
      removeRequestHeader,

      getSpecialKey: getPlatformSpecialKey,

      commonHeaders,
      updateGQLHeader,
    }
  },
})
</script>
