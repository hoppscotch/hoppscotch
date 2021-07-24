<template>
  <div>
    <Splitpanes vertical :dbl-click-splitter="false">
      <Pane class="overflow-auto hide-scrollbar">
        <Splitpanes horizontal :dbl-click-splitter="false">
          <Pane class="overflow-auto hide-scrollbar">
            <div class="bg-primary flex p-4 top-0 z-20 sticky">
              <div class="flex-1 inline-flex">
                <input
                  id="url"
                  v-model="url"
                  type="url"
                  spellcheck="false"
                  class="
                    bg-primaryLight
                    border border-divider
                    rounded-l
                    font-semibold font-mono
                    text-secondaryDark
                    w-full
                    py-1
                    px-4
                    transition
                    truncate
                    focus:outline-none focus:border-accent
                  "
                  :placeholder="$t('url')"
                  @keyup.enter="onPollSchemaClick()"
                />
                <ButtonPrimary
                  id="get"
                  name="get"
                  :icon="!isPollingSchema ? 'sync' : 'sync_disabled'"
                  :label="!isPollingSchema ? $t('connect') : $t('disconnect')"
                  class="rounded-l-none"
                  @click.native="onPollSchemaClick"
                />
              </div>
            </div>
            <SmartTabs styles="sticky top-68px z-10">
              <SmartTab :id="'query'" :label="$t('query')" :selected="true">
                <AppSection label="query">
                  <div
                    class="
                      bg-primary
                      border-b border-dividerLight
                      flex flex-1
                      pl-4
                      top-108px
                      z-10
                      sticky
                      items-center
                      justify-between
                      gqlRunQuery
                    "
                  >
                    <label for="gqlQuery" class="font-semibold text-xs">
                      {{ $t("query") }}
                    </label>
                    <div class="flex">
                      <ButtonSecondary
                        :label="$t('run')"
                        :shortcut="[getSpecialKey(), 'Enter']"
                        icon="play_arrow"
                        class="text-xs !text-accent"
                        @click.native="runQuery()"
                      />
                      <ButtonSecondary
                        v-tippy="{ theme: 'tooltip' }"
                        :title="$t('copy')"
                        :icon="copyQueryIcon"
                        @click.native="copyQuery"
                      />
                      <ButtonSecondary
                        v-tippy="{ theme: 'tooltip' }"
                        :title="`${$t(
                          'prettify_query'
                        )} (${getSpecialKey()}-P)`"
                        :icon="prettifyQueryIcon"
                        @click.native="prettifyQuery"
                      />
                      <ButtonSecondary
                        ref="saveRequest"
                        v-tippy="{ theme: 'tooltip' }"
                        :title="$t('save_to_collections')"
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
                      minLines: '16',
                      fontSize: '14px',
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
                      pl-4
                      top-108px
                      z-10
                      sticky
                      items-center
                      justify-between
                    "
                  >
                    <label class="font-semibold text-xs">
                      {{ $t("variables") }}
                    </label>
                    <div class="flex">
                      <ButtonSecondary
                        v-tippy="{ theme: 'tooltip' }"
                        :title="$t('copy')"
                        :icon="copyVariablesIcon"
                        @click.native="copyVariables"
                      />
                      <!-- <ButtonSecondary
                        v-tippy="{ theme: 'tooltip' }"
                        :title="`${$t(
                          'prettify_variables'
                        )} (${getSpecialKey()}-P)`"
                        :icon="prettifyVariablesIcon"
                        @click.native="prettifyVariables"
                      /> -->
                    </div>
                  </div>
                  <SmartAceEditor
                    ref="variableEditor"
                    v-model="variableString"
                    :lang="'json'"
                    :options="{
                      maxLines: Infinity,
                      minLines: '16',
                      fontSize: '14px',
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
                      pl-4
                      top-108px
                      z-10
                      sticky
                      items-center
                      justify-between
                    "
                  >
                    <label class="font-semibold text-xs">
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
                        :title="$t('add_new')"
                        icon="add"
                        @click.native="addRequestHeader"
                      />
                    </div>
                  </div>
                  <div
                    v-for="(header, index) in headers"
                    :key="`header-${index}`"
                    class="
                      divide-x divide-dashed divide-divider
                      border-b border-dashed border-divider
                      flex
                    "
                    :class="{ 'border-t': index == 0 }"
                  >
                    <SmartAutoComplete
                      :placeholder="$t('header_count', { count: index + 1 })"
                      :source="commonHeaders"
                      :spellcheck="false"
                      :value="header.key"
                      autofocus
                      @input="
                        $store.commit('setGQLHeaderKey', {
                          index,
                          value: $event,
                        })
                      "
                    />
                    <input
                      class="
                        bg-primaryLight
                        flex
                        font-semibold font-mono
                        flex-1
                        text-xs
                        py-2
                        px-4
                        focus:outline-none
                      "
                      :placeholder="$t('value_count', { count: index + 1 })"
                      :name="`value ${index}`"
                      :value="header.value"
                      autofocus
                      @change="
                        $store.commit('setGQLHeaderValue', {
                          index,
                          value: $event.target.value,
                        })
                      "
                    />
                    <div>
                      <ButtonSecondary
                        v-tippy="{ theme: 'tooltip' }"
                        :title="
                          header.hasOwnProperty('active')
                            ? header.active
                              ? $t('turn_off')
                              : $t('turn_on')
                            : $t('turn_off')
                        "
                        :icon="
                          header.hasOwnProperty('active')
                            ? header.active
                              ? 'check_box'
                              : 'check_box_outline_blank'
                            : 'check_box'
                        "
                        @click.native="
                          $store.commit('setActiveGQLHeader', {
                            index,
                            value: header.hasOwnProperty('active')
                              ? !header.active
                              : false,
                          })
                        "
                      />
                    </div>
                    <div>
                      <ButtonSecondary
                        v-tippy="{ theme: 'tooltip' }"
                        :title="$t('delete')"
                        icon="delete"
                        @click.native="removeRequestHeader(index)"
                      />
                    </div>
                  </div>
                </AppSection>
              </SmartTab>
            </SmartTabs>
          </Pane>
          <Pane class="overflow-auto hide-scrollbar">
            <AppSection ref="response" label="response">
              <div
                v-if="response"
                class="
                  bg-primary
                  border-b border-dividerLight
                  flex flex-1
                  pl-4
                  top-0
                  z-10
                  sticky
                  items-center
                  justify-between
                "
              >
                <label class="font-semibold text-xs" for="responseField">
                  {{ $t("response") }}
                </label>
                <div class="flex">
                  <ButtonSecondary
                    ref="downloadResponse"
                    v-tippy="{ theme: 'tooltip' }"
                    :title="$t('download_file')"
                    :icon="downloadResponseIcon"
                    @click.native="downloadResponse"
                  />
                  <ButtonSecondary
                    ref="copyResponseButton"
                    v-tippy="{ theme: 'tooltip' }"
                    :title="$t('copy')"
                    :icon="copyResponseIcon"
                    @click.native="copyResponse"
                  />
                </div>
              </div>
              <SmartAceEditor
                v-if="response"
                :value="response"
                :lang="'json'"
                :lint="false"
                :options="{
                  maxLines: Infinity,
                  minLines: '16',
                  fontSize: '14px',
                  autoScrollEditorIntoView: true,
                  readOnly: true,
                  showPrintMargin: false,
                  useWorker: false,
                }"
              />
              <div
                v-else
                class="
                  flex flex-col flex-1
                  text-secondaryLight
                  py-8
                  px-4
                  items-center
                  justify-center
                "
              >
                <i class="opacity-75 pb-2 material-icons">send</i>
                <span class="text-xs text-center">
                  {{ $t("waiting_send_req") }}
                </span>
              </div>
            </AppSection>
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane
        v-if="RIGHT_SIDEBAR"
        max-size="30"
        size="25"
        min-size="20"
        class="overflow-auto hide-scrollbar"
      >
        <aside>
          <SmartTabs styles="sticky z-10 top-0">
            <SmartTab :id="'docs'" :label="`Docs`" :selected="true">
              <AppSection label="docs">
                <div class="bg-primaryLight flex flex-col top-10 z-10 sticky">
                  <input
                    v-model="graphqlFieldsFilterText"
                    type="text"
                    :placeholder="$t('search')"
                    class="
                      bg-primaryLight
                      flex
                      font-semibold font-mono
                      flex-1
                      text-xs
                      py-3
                      px-4
                      focus:outline-none
                    "
                  />
                </div>
                <SmartTabs
                  ref="gqlTabs"
                  styles="
                    border-t border-dividerLight sticky z-10 top-20"
                >
                  <div class="gqlTabs">
                    <SmartTab
                      v-if="queryFields.length > 0"
                      :id="'queries'"
                      :label="$t('queries')"
                      :selected="true"
                      class="divide-y divide-dividerLight"
                    >
                      <GraphqlField
                        v-for="(field, index) in filteredQueryFields"
                        :key="`field-${index}`"
                        :gql-field="field"
                        :jump-type-callback="handleJumpToType"
                        class="p-4"
                      />
                    </SmartTab>
                    <SmartTab
                      v-if="mutationFields.length > 0"
                      :id="'mutations'"
                      :label="$t('mutations')"
                      class="divide-y divide-dividerLight"
                    >
                      <GraphqlField
                        v-for="(field, index) in filteredMutationFields"
                        :key="`field-${index}`"
                        :gql-field="field"
                        :jump-type-callback="handleJumpToType"
                        class="p-4"
                      />
                    </SmartTab>
                    <SmartTab
                      v-if="subscriptionFields.length > 0"
                      :id="'subscriptions'"
                      :label="$t('subscriptions')"
                      class="divide-y divide-dividerLight"
                    >
                      <GraphqlField
                        v-for="(field, index) in filteredSubscriptionFields"
                        :key="`field-${index}`"
                        :gql-field="field"
                        :jump-type-callback="handleJumpToType"
                        class="p-4"
                      />
                    </SmartTab>
                    <SmartTab
                      v-if="graphqlTypes.length > 0"
                      :id="'types'"
                      ref="typesTab"
                      :label="$t('types')"
                      class="divide-y divide-dividerLight"
                    >
                      <GraphqlType
                        v-for="(type, index) in filteredGraphqlTypes"
                        :key="`type-${index}`"
                        :gql-type="type"
                        :gql-types="graphqlTypes"
                        :is-highlighted="
                          isGqlTypeHighlighted({ gqlType: type })
                        "
                        :highlighted-fields="
                          getGqlTypeHighlightedFields({ gqlType: type })
                        "
                        :jump-type-callback="handleJumpToType"
                      />
                    </SmartTab>
                  </div>
                </SmartTabs>
                <div
                  v-if="
                    queryFields.length === 0 &&
                    mutationFields.length === 0 &&
                    subscriptionFields.length === 0 &&
                    graphqlTypes.length === 0
                  "
                  class="
                    flex flex-col
                    text-secondaryLight
                    p-4
                    items-center
                    justify-center
                  "
                >
                  <i class="opacity-75 pb-2 material-icons">link</i>
                  <span class="text-xs text-center">
                    {{ $t("connect_graphql_endpoint") }}
                  </span>
                </div>
              </AppSection>
            </SmartTab>

            <SmartTab :id="'history'" :label="$t('history')">
              <History
                ref="graphqlHistoryComponent"
                :page="'graphql'"
                @useHistory="handleUseHistory"
              />
            </SmartTab>

            <SmartTab :id="'collections'" :label="$t('collections')">
              <CollectionsGraphql />
            </SmartTab>

            <SmartTab :id="'schema'" :label="`Schema`">
              <AppSection ref="schema" label="schema">
                <div
                  v-if="schema"
                  class="
                    bg-primary
                    border-b border-dividerLight
                    flex flex-1
                    pl-4
                    top-10
                    z-10
                    sticky
                    items-center
                    justify-between
                  "
                >
                  <label class="font-semibold text-xs">
                    {{ $t("schema") }}
                  </label>
                  <div class="flex">
                    <ButtonSecondary
                      ref="downloadSchema"
                      v-tippy="{ theme: 'tooltip' }"
                      :title="$t('download_file')"
                      :icon="downloadSchemaIcon"
                      @click.native="downloadSchema"
                    />
                    <ButtonSecondary
                      ref="copySchemaCode"
                      v-tippy="{ theme: 'tooltip' }"
                      :title="$t('copy')"
                      :icon="copySchemaIcon"
                      @click.native="copySchema"
                    />
                  </div>
                </div>
                <SmartAceEditor
                  v-if="schema"
                  :value="schema"
                  :lang="'graphqlschema'"
                  :options="{
                    maxLines: Infinity,
                    minLines: '16',
                    fontSize: '14px',
                    autoScrollEditorIntoView: true,
                    readOnly: true,
                    showPrintMargin: false,
                    useWorker: false,
                  }"
                />
                <div
                  v-else
                  class="
                    flex flex-col
                    text-secondaryLight
                    p-4
                    items-center
                    justify-center
                  "
                >
                  <i class="opacity-75 pb-2 material-icons">link</i>
                  <span class="text-xs text-center">
                    {{ $t("connect_graphql_endpoint") }}
                  </span>
                </div>
              </AppSection>
            </SmartTab>
          </SmartTabs>
        </aside>
      </Pane>
    </Splitpanes>

    <CollectionsSaveRequest
      mode="graphql"
      :show="showSaveRequestModal"
      :editing-request="editRequest"
      @hide-modal="hideRequestModal"
    />
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import * as gql from "graphql"
import { commonHeaders } from "~/helpers/headers"
import { getPlatformSpecialKey } from "~/helpers/platformutils"
import { getCurrentStrategyID, sendNetworkRequest } from "~/helpers/network"
import { getSettingSubject, useSetting } from "~/newstore/settings"
import { addGraphqlHistoryEntry } from "~/newstore/history"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"

export default defineComponent({
  components: { Splitpanes, Pane },
  beforeRouteLeave(_to, _from, next) {
    this.isPollingSchema = false
    if (this.timeoutSubscription) clearTimeout(this.timeoutSubscription)
    next()
  },
  setup() {
    return {
      RIGHT_SIDEBAR: useSetting("RIGHT_SIDEBAR"),
    }
  },
  data() {
    return {
      commonHeaders,
      queryFields: [],
      mutationFields: [],
      subscriptionFields: [],
      graphqlTypes: [],
      downloadResponseIcon: "save_alt",
      downloadSchemaIcon: "save_alt",
      copyQueryIcon: "content_copy",
      copySchemaIcon: "content_copy",
      copyResponseIcon: "content_copy",
      copyVariablesIcon: "content_copy",
      prettifyQueryIcon: "photo_filter",
      // prettifyVariablesIcon: "photo_filter",
      graphqlFieldsFilterText: undefined,
      isPollingSchema: false,
      timeoutSubscription: null,
      editRequest: {},
      showSaveRequestModal: false,
    }
  },
  subscriptions() {
    return {
      SCROLL_INTO_ENABLED: getSettingSubject("SCROLL_INTO_ENABLED"),
    }
  },
  head() {
    return {
      title: `GraphQL • Hoppscotch`,
    }
  },
  computed: {
    selectedRequest() {
      return this.$store.state.postwoman.selectedGraphqlRequest
    },
    filteredQueryFields() {
      return this.getFilteredGraphqlFields({
        filterText: this.graphqlFieldsFilterText,
        fields: this.queryFields,
      })
    },
    filteredMutationFields() {
      return this.getFilteredGraphqlFields({
        filterText: this.graphqlFieldsFilterText,
        fields: this.mutationFields,
      })
    },
    filteredSubscriptionFields() {
      return this.getFilteredGraphqlFields({
        filterText: this.graphqlFieldsFilterText,
        fields: this.subscriptionFields,
      })
    },
    filteredGraphqlTypes() {
      return this.getFilteredGraphqlTypes({
        filterText: this.graphqlFieldsFilterText,
        types: this.graphqlTypes,
      })
    },
    url: {
      get() {
        return this.$store.state.gql.url
      },
      set(value) {
        this.$store.commit("setGQLState", { value, attribute: "url" })
      },
    },
    headers: {
      get() {
        return this.$store.state.gql.headers
      },
      set(value) {
        this.$store.commit("setGQLState", { value, attribute: "headers" })
      },
    },
    gqlQueryString: {
      get() {
        return this.$store.state.gql.query
      },
      set(value) {
        this.$store.commit("setGQLState", { value, attribute: "query" })
      },
    },
    response: {
      get() {
        return this.$store.state.gql.response
      },
      set(value) {
        this.$store.commit("setGQLState", { value, attribute: "response" })
      },
    },
    schema: {
      get() {
        return this.$store.state.gql.schema
      },
      set(value) {
        this.$store.commit("setGQLState", { value, attribute: "schema" })
      },
    },
    variableString: {
      get() {
        return this.$store.state.gql.variablesJSONString
      },
      set(value) {
        this.$store.commit("setGQLState", {
          value,
          attribute: "variablesJSONString",
        })
      },
    },
  },
  watch: {
    selectedRequest(newValue) {
      if (!newValue) return
      this.url = newValue.url
      this.gqlQueryString = newValue.query
      this.headers = newValue.headers
      this.variableString = newValue.variables
    },
  },
  mounted() {
    if (
      this.$store.state.gql.schemaIntrospection &&
      this.$store.state.gql.schema
    ) {
      const gqlSchema = gql.buildClientSchema(
        JSON.parse(this.$store.state.gql.schemaIntrospection)
      )
      this.getDocsFromSchema(gqlSchema)
    }
  },
  methods: {
    hideRequestModal() {
      this.showSaveRequestModal = false
      this.editRequest = {}
    },
    saveRequest() {
      this.editRequest = {
        url: this.url,
        query: this.gqlQueryString,
        headers: this.headers,
        variables: this.variableString,
      }
      this.showSaveRequestModal = true
    },
    // useSelectedEnvironment(event) {
    //   console.log("use selected environment")
    // },
    handleUseHistory(entry) {
      this.url = entry.url
      this.headers = entry.headers
      this.gqlQueryString = entry.query
      this.response = entry.responseText
      this.variableString = entry.variables
      this.schema = ""
    },
    isGqlTypeHighlighted({ gqlType }) {
      if (!this.graphqlFieldsFilterText) return false

      return this.isTextFoundInGraphqlFieldObject({
        text: this.graphqlFieldsFilterText,
        graphqlFieldObject: gqlType,
      })
    },
    getGqlTypeHighlightedFields({ gqlType }) {
      if (!this.graphqlFieldsFilterText) return []

      const fields = Object.values(gqlType._fields || {})

      if (!fields || fields.length === 0) return []

      return fields.filter((field) =>
        this.isTextFoundInGraphqlFieldObject({
          text: this.graphqlFieldsFilterText,
          graphqlFieldObject: field,
        })
      )
    },
    isTextFoundInGraphqlFieldObject({ text, graphqlFieldObject }) {
      const normalizedText = text.toLowerCase()

      const isFilterTextFoundInDescription = graphqlFieldObject.description
        ? graphqlFieldObject.description.toLowerCase().includes(normalizedText)
        : false
      const isFilterTextFoundInName = graphqlFieldObject.name
        .toLowerCase()
        .includes(normalizedText)

      return isFilterTextFoundInDescription || isFilterTextFoundInName
    },
    getFilteredGraphqlFields({ filterText, fields }) {
      if (!filterText) return fields

      return fields.filter((field) =>
        this.isTextFoundInGraphqlFieldObject({
          text: filterText,
          graphqlFieldObject: field,
        })
      )
    },
    getFilteredGraphqlTypes({ filterText, types }) {
      if (!filterText) return types

      return types.filter((type) => {
        const isFilterTextMatching = this.isTextFoundInGraphqlFieldObject({
          text: filterText,
          graphqlFieldObject: type,
        })

        if (isFilterTextMatching) {
          return true
        }

        const isFilterTextMatchingAtLeastOneField = Object.values(
          type._fields || {}
        ).some((field) =>
          this.isTextFoundInGraphqlFieldObject({
            text: filterText,
            graphqlFieldObject: field,
          })
        )

        return isFilterTextMatchingAtLeastOneField
      })
    },
    getSpecialKey: getPlatformSpecialKey,
    prettifyQuery() {
      this.$refs.queryEditor.prettifyQuery()
      this.prettifyQueryIcon = "done"
      setTimeout(() => (this.prettifyQueryIcon = "photo_filter"), 1000)
    },
    // prettifyVariables() {
    //   this.$refs.variableEditor.prettifyQuery()
    //   this.prettifyVariablesIcon = "done"
    //   setTimeout(() => (this.prettifyVariablesIcon = "photo_filter"), 1000)
    // },
    async handleJumpToType(type) {
      this.$refs.gqlTabs.selectTab(this.$refs.typesTab)
      await this.$nextTick()

      const rootTypeName = this.resolveRootType(type).name

      const target = document.getElementById(`type_${rootTypeName}`)
      if (target && this.SCROLL_INTO_ENABLED) {
        this.$refs.gqlTabs.$el
          .querySelector(".gqlTabs")
          .scrollTo({ top: target.offsetTop, behavior: "smooth" })
      }
    },
    resolveRootType(type) {
      let t = type
      while (t.ofType != null) t = t.ofType
      return t
    },
    copySchema() {
      this.copyToClipboard(this.schema)
      this.copySchemaIcon = "done"
      setTimeout(() => (this.copySchemaIcon = "content_copy"), 1000)
    },
    copyQuery() {
      this.copyToClipboard(this.gqlQueryString)
      this.copyQueryIcon = "done"
      setTimeout(() => (this.copyQueryIcon = "content_copy"), 1000)
    },
    copyResponse() {
      this.copyToClipboard(this.response)
      this.copyResponseIcon = "done"
      setTimeout(() => (this.copyResponseIcon = "content_copy"), 1000)
    },
    copyVariables() {
      this.copyToClipboard(this.variableString)
      this.copyVariablesIcon = "done"
      setTimeout(() => (this.copyVariablesIcon = "content_copy"), 1000)
    },
    copyToClipboard(content) {
      const aux = document.createElement("textarea")
      aux.innerText = content
      document.body.appendChild(aux)
      aux.select()
      document.execCommand("copy")
      document.body.removeChild(aux)
      this.$toast.success(this.$t("copied_to_clipboard"), {
        icon: "done",
      })
    },
    async runQuery() {
      const startTime = Date.now()

      // Start showing the loading bar as soon as possible.
      // The nuxt axios module will hide it when the request is made.
      this.$nuxt.$loading.start()

      this.response = this.$t("loading")
      if (this.SCROLL_INTO_ENABLED) this.scrollInto("response")

      try {
        const headers = {}
        this.headers
          .filter((item) =>
            Object.prototype.hasOwnProperty.call(item, "active")
              ? item.active === true
              : true
          )
          .forEach(({ key, value }) => {
            headers[key] = value
          })

        const variables = JSON.parse(this.variableString || "{}")

        const gqlQueryString = this.gqlQueryString

        const reqOptions = {
          method: "post",
          url: this.url,
          headers: {
            ...headers,
            "content-type": "application/json",
          },
          data: JSON.stringify({ query: gqlQueryString, variables }),
        }
        let entry = {
          url: this.url,
          query: gqlQueryString,
          variables: this.variableString,
          star: false,
          headers: this.headers,
        }
        const res = await sendNetworkRequest(reqOptions)

        // HACK: Temporary trailing null character issue from the extension fix
        const responseText = new TextDecoder("utf-8")
          .decode(res.data)
          .replace(/\0+$/, "")

        this.response = JSON.stringify(JSON.parse(responseText), null, 2)

        this.$nuxt.$loading.finish()
        const duration = Date.now() - startTime
        this.$toast.success(this.$t("finished_in", { duration }), {
          icon: "done",
        })

        entry = {
          ...entry,
          response: this.response,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          updatedOn: new Date(),
          duration,
        }

        addGraphqlHistoryEntry(entry)
      } catch (error) {
        this.response = `${error}. ${this.$t("check_console_details")}`
        this.$nuxt.$loading.finish()

        this.$toast.error(`${error} ${this.$t("f12_details")}`, {
          icon: "error",
        })
        console.log("Error", error)
      }

      logHoppRequestRunToAnalytics({
        platform: "graphql-query",
        strategy: getCurrentStrategyID(),
      })
    },

    // NOTE : schema required here is the GQL Schema document object, not the schema string
    getDocsFromSchema(schema) {
      if (schema.getQueryType()) {
        const fields = schema.getQueryType().getFields()
        const qFields = []
        for (const field in fields) {
          qFields.push(fields[field])
        }
        this.queryFields = qFields
      }

      if (schema.getMutationType()) {
        const fields = schema.getMutationType().getFields()
        const mFields = []
        for (const field in fields) {
          mFields.push(fields[field])
        }
        this.mutationFields = mFields
      }

      if (schema.getSubscriptionType()) {
        const fields = schema.getSubscriptionType().getFields()
        const sFields = []
        for (const field in fields) {
          sFields.push(fields[field])
        }
        this.subscriptionFields = sFields
      }

      const typeMap = schema.getTypeMap()
      const types = []

      const queryTypeName = schema.getQueryType()
        ? schema.getQueryType().name
        : ""
      const mutationTypeName = schema.getMutationType()
        ? schema.getMutationType().name
        : ""
      const subscriptionTypeName = schema.getSubscriptionType()
        ? schema.getSubscriptionType().name
        : ""

      for (const typeName in typeMap) {
        const type = typeMap[typeName]
        if (
          !type.name.startsWith("__") &&
          ![queryTypeName, mutationTypeName, subscriptionTypeName].includes(
            type.name
          ) &&
          (type instanceof gql.GraphQLObjectType ||
            type instanceof gql.GraphQLInputObjectType ||
            type instanceof gql.GraphQLEnumType ||
            type instanceof gql.GraphQLInterfaceType)
        ) {
          types.push(type)
        }
      }
      this.graphqlTypes = types
    },
    async onPollSchemaClick() {
      if (this.isPollingSchema) {
        this.isPollingSchema = false
      } else {
        this.isPollingSchema = true
        await this.getSchema()

        this.pollSchema()

        logHoppRequestRunToAnalytics({
          platform: "graphql-schema",
          strategy: getCurrentStrategyID(),
        })
      }
    },
    async pollSchema() {
      if (!this.isPollingSchema) return

      this.$nuxt.$loading.start()

      try {
        const query = JSON.stringify({
          query: gql.getIntrospectionQuery(),
        })

        const headers = {}
        this.headers
          .filter((item) =>
            Object.prototype.hasOwnProperty.call(item, "active")
              ? item.active === true
              : true
          )
          .forEach(({ key, value }) => {
            headers[key] = value
          })

        const reqOptions = {
          method: "post",
          url: this.url,
          headers: {
            ...headers,
            "content-type": "application/json",
          },
          data: query,
        }

        const data = await sendNetworkRequest(reqOptions, this.$store)

        // HACK : Temporary trailing null character issue from the extension fix
        const response = new TextDecoder("utf-8")
          .decode(data.data)
          .replace(/\0+$/, "")
        const introspectResponse = JSON.parse(response)

        const schema = gql.buildClientSchema(introspectResponse.data)

        this.$store.commit("setGQLState", {
          value: JSON.stringify(introspectResponse.data),
          attribute: "schemaIntrospection",
        })

        this.schema = gql.printSchema(schema, {
          commentDescriptions: true,
        })

        this.getDocsFromSchema(schema)

        this.$refs.queryEditor.setValidationSchema(schema)
        this.$nuxt.$loading.finish()

        if (this.isPollingSchema)
          this.timeoutSubscription = setTimeout(this.pollSchema, 7000)
      } catch (error) {
        this.$nuxt.$loading.finish()

        this.schema = `${error}. ${this.$t("check_console_details")}`
        this.$toast.error(
          `${this.$t("graphql_introspect_failed")} ${this.$t(
            "check_graphql_valid"
          )}`,
          {
            icon: "error",
          }
        )
        console.log("Error", error)

        this.isPollingSchema = false
      }

      this.$nuxt.$loading.finish()
    },
    async getSchema() {
      const startTime = Date.now()

      // Start showing the loading bar as soon as possible.
      // The nuxt axios module will hide it when the request is made.
      this.$nuxt.$loading.start()

      this.schema = this.$t("loading")
      if (this.SCROLL_INTO_ENABLED) this.scrollInto("schema")

      try {
        const query = JSON.stringify({
          query: gql.getIntrospectionQuery(),
        })

        const headers = {}
        this.headers
          .filter((item) =>
            Object.prototype.hasOwnProperty.call(item, "active")
              ? item.active === true
              : true
          )
          .forEach(({ key, value }) => {
            headers[key] = value
          })

        const reqOptions = {
          method: "post",
          url: this.url,
          headers: {
            ...headers,
            "content-type": "application/json",
          },
          data: query,
        }

        const data = await sendNetworkRequest(reqOptions, this.$store)

        // HACK : Temporary trailing null character issue from the extension fix
        const response = new TextDecoder("utf-8")
          .decode(data.data)
          .replace(/\0+$/, "")
        const introspectResponse = JSON.parse(response)

        const schema = gql.buildClientSchema(introspectResponse.data)

        this.$store.commit("setGQLState", {
          value: JSON.stringify(introspectResponse.data),
          attribute: "schemaIntrospection",
        })

        this.schema = gql.printSchema(schema, {
          commentDescriptions: true,
        })

        this.getDocsFromSchema(schema)

        this.$refs.queryEditor.setValidationSchema(schema)
        this.$nuxt.$loading.finish()
        const duration = Date.now() - startTime
        this.$toast.info(this.$t("finished_in", { duration }), {
          icon: "done",
        })
      } catch (error) {
        this.$nuxt.$loading.finish()

        this.schema = `${error}. ${this.$t("check_console_details")}`
        this.$toast.error(
          `${this.$t("graphql_introspect_failed")} ${this.$t(
            "check_graphql_valid"
          )}`,
          {
            icon: "error",
          }
        )
        console.log("Error", error)
      }
    },
    downloadResponse() {
      const dataToWrite = this.response
      const file = new Blob([dataToWrite], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url
      a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
      document.body.appendChild(a)
      a.click()
      this.downloadResponseIcon = "done"
      this.$toast.success(this.$t("download_started"), {
        icon: "done",
      })
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        this.downloadResponseIcon = "save_alt"
      }, 1000)
    },
    downloadSchema() {
      const dataToWrite = JSON.stringify(this.schema, null, 2)
      const file = new Blob([dataToWrite], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url
      a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
      document.body.appendChild(a)
      a.click()
      this.downloadSchemaIcon = "done"
      this.$toast.success(this.$t("download_started"), {
        icon: "done",
      })
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        this.downloadSchemaIcon = "save_alt"
      }, 1000)
    },
    addRequestHeader() {
      this.$store.commit("addGQLHeader", {
        key: "",
        value: "",
      })
      return false
    },
    removeRequestHeader(index) {
      // .slice() is used so we get a separate array, rather than just a reference
      const oldHeaders = this.headers.slice()

      this.$store.commit("removeGQLHeader", index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          duration: 4000,
          onClick: (_, toastObject) => {
            this.headers = oldHeaders
            toastObject.remove()
          },
        },
      })
    },
    scrollInto(view) {
      this.$refs[view].$el.scrollIntoView({
        behavior: "smooth",
      })
    },
    updateQuery(updatedQuery) {
      this.gqlQueryString = updatedQuery
    },
  },
})
</script>
