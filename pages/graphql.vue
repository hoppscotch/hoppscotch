<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <AppSection label="endpoint">
          <ul>
            <li>
              <label for="url">{{ $t("url") }}</label>
              <input
                id="url"
                v-model="url"
                type="url"
                spellcheck="false"
                class="input md:rounded-bl-lg"
                :placeholder="$t('url')"
                @keyup.enter="onPollSchemaClick()"
              />
            </li>
            <div>
              <li>
                <label for="get" class="hide-on-small-screen">&nbsp;</label>
                <button
                  id="get"
                  name="get"
                  class="
                    button
                    rounded-b-lg
                    md:rounded-bl-none md:rounded-br-lg
                  "
                  @click="onPollSchemaClick"
                >
                  {{ !isPollingSchema ? $t("connect") : $t("disconnect") }}
                  <span
                    ><i class="material-icons">{{
                      !isPollingSchema ? "sync" : "sync_disabled"
                    }}</i></span
                  >
                </button>
              </li>
            </div>
          </ul>
        </AppSection>

        <AppSection label="headers">
          <div class="flex flex-col">
            <label>{{ $t("headers") }}</label>
            <ul v-if="headers.length !== 0">
              <li>
                <div class="row-wrapper">
                  <label for="headerList">{{ $t("header_list") }}</label>
                  <div>
                    <button
                      v-tooltip.bottom="$t('clear')"
                      class="icon button"
                      @click="headers = []"
                    >
                      <i class="material-icons">clear_all</i>
                    </button>
                  </div>
                </div>
              </li>
            </ul>
            <ul
              v-for="(header, index) in headers"
              :key="`${header.value}_${index}`"
              class="
                divide-y divide-dashed divide-divider
                border-b border-dashed border-divider
                md:divide-x md:divide-y-0
              "
              :class="{ 'border-t': index == 0 }"
            >
              <li>
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
              </li>
              <li>
                <input
                  class="input"
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
              </li>
              <div>
                <li>
                  <button
                    v-tooltip.bottom="{
                      content: header.hasOwnProperty('active')
                        ? header.active
                          ? $t('turn_off')
                          : $t('turn_on')
                        : $t('turn_off'),
                    }"
                    class="icon button"
                    @click="
                      $store.commit('setActiveGQLHeader', {
                        index,
                        value: header.hasOwnProperty('active')
                          ? !header.active
                          : false,
                      })
                    "
                  >
                    <i class="material-icons">
                      {{
                        header.hasOwnProperty("active")
                          ? header.active
                            ? "check_box"
                            : "check_box_outline_blank"
                          : "check_box"
                      }}
                    </i>
                  </button>
                </li>
              </div>
              <div>
                <li>
                  <button
                    v-tooltip.bottom="$t('delete')"
                    class="icon button"
                    @click="removeRequestHeader(index)"
                  >
                    <i class="material-icons">delete</i>
                  </button>
                </li>
              </div>
            </ul>
            <ul>
              <li>
                <button class="icon button" @click="addRequestHeader">
                  <i class="material-icons">add</i>
                  <span>{{ $t("add_new") }}</span>
                </button>
              </li>
            </ul>
          </div>
        </AppSection>

        <AppSection ref="schema" label="schema">
          <div class="row-wrapper">
            <label>{{ $t("schema") }}</label>
            <div v-if="schema">
              <button
                ref="ToggleExpandResponse"
                v-tooltip="{
                  content: !expandResponse
                    ? $t('expand_response')
                    : $t('collapse_response'),
                }"
                class="icon button"
                @click="ToggleExpandResponse"
              >
                <i class="material-icons">
                  {{ !expandResponse ? "unfold_more" : "unfold_less" }}
                </i>
              </button>
              <button
                ref="downloadSchema"
                v-tooltip="$t('download_file')"
                class="icon button"
                @click="downloadSchema"
              >
                <i class="material-icons">save_alt</i>
              </button>
              <button
                ref="copySchemaCode"
                v-tooltip="$t('copy_schema')"
                class="icon button"
                @click="copySchema"
              >
                <i class="material-icons">content_copy</i>
              </button>
            </div>
          </div>
          <SmartAceEditor
            v-if="schema"
            :value="schema"
            :lang="'graphqlschema'"
            :options="{
              maxLines: responseBodyMaxLines,
              minLines: 16,
              fontSize: '15px',
              autoScrollEditorIntoView: true,
              readOnly: true,
              showPrintMargin: false,
              useWorker: false,
            }"
            styles="rounded-b-lg"
          />
          <input
            v-else
            ref="status"
            class="input rounded-b-lg missing-data-response"
            :value="$t('waiting_receive_schema')"
            name="status"
            readonly
            type="text"
          />
        </AppSection>

        <AppSection label="query">
          <div class="row-wrapper gqlRunQuery">
            <label for="gqlQuery">{{ $t("query") }}</label>
            <div>
              <button
                v-tooltip.bottom="
                  `${$t('run_query')} (${getSpecialKey()}-Enter)`
                "
                class="button"
                @click="runQuery()"
              >
                <i class="material-icons">play_arrow</i>
              </button>
              <button
                ref="copyQueryButton"
                v-tooltip="$t('copy_query')"
                class="icon button"
                @click="copyQuery"
              >
                <i class="material-icons">content_copy</i>
              </button>
              <button
                v-tooltip="`${$t('prettify_query')} (${getSpecialKey()}-P)`"
                class="icon button"
                @click="doPrettifyQuery"
              >
                <i class="material-icons">photo_filter</i>
              </button>
              <button
                ref="saveRequest"
                v-tooltip.bottom="$t('save_to_collections')"
                class="icon button"
                @click="saveRequest"
              >
                <i class="material-icons">create_new_folder</i>
              </button>
            </div>
          </div>
          <GraphqlQueryEditor
            ref="queryEditor"
            v-model="gqlQueryString"
            styles="rounded-b-lg"
            :on-run-g-q-l-query="runQuery"
            :options="{
              maxLines: responseBodyMaxLines,
              minLines: 10,
              fontSize: '15px',
              autoScrollEditorIntoView: true,
              showPrintMargin: false,
              useWorker: false,
            }"
            @update-query="updateQuery"
          />
        </AppSection>

        <AppSection label="variables">
          <div class="flex flex-col">
            <label>{{ $t("variables") }}</label>
            <SmartAceEditor
              v-model="variableString"
              :lang="'json'"
              :options="{
                maxLines: 10,
                minLines: 5,
                fontSize: '15px',
                autoScrollEditorIntoView: true,
                showPrintMargin: false,
                useWorker: false,
              }"
              styles="rounded-b-lg"
            />
          </div>
        </AppSection>

        <AppSection ref="response" label="response">
          <div class="flex flex-col">
            <label>{{ $t("response") }}</label>
            <div class="row-wrapper">
              <label for="responseField">{{ $t("response_body") }}</label>
              <div>
                <button
                  v-if="response"
                  ref="downloadResponse"
                  v-tooltip="$t('download_file')"
                  class="icon button"
                  @click="downloadResponse"
                >
                  <i class="material-icons">save_alt</i>
                </button>
                <button
                  v-if="response"
                  ref="copyResponseButton"
                  v-tooltip="$t('copy_response')"
                  class="icon button"
                  @click="copyResponse"
                >
                  <i class="material-icons">content_copy</i>
                </button>
              </div>
            </div>
            <SmartAceEditor
              v-if="response"
              :value="response"
              :lang="'json'"
              :lint="false"
              :options="{
                maxLines: responseBodyMaxLines,
                minLines: 10,
                fontSize: '15px',
                autoScrollEditorIntoView: true,
                readOnly: true,
                showPrintMargin: false,
                useWorker: false,
              }"
              styles="rounded-b-lg"
            />
            <input
              v-else
              ref="status"
              class="input rounded-b-lg missing-data-response"
              :value="$t('waiting_receive_response')"
              name="status"
              readonly
              type="text"
            />
          </div>
        </AppSection>
      </div>

      <TranslateSlideLeft>
        <aside
          v-if="activeSidebar"
          class="sticky-inner inner-right lg:max-w-md"
        >
          <SmartTabs>
            <SmartTab :id="'docs'" :label="`Docs`" :selected="true">
              <AppSection label="docs">
                <section class="flex-col">
                  <input
                    v-model="graphqlFieldsFilterText"
                    type="text"
                    :placeholder="$t('search')"
                    class="input rounded-t-lg"
                  />
                  <SmartTabs ref="gqlTabs" styles="m-4">
                    <div class="gqlTabs">
                      <SmartTab
                        v-if="queryFields.length > 0"
                        :id="'queries'"
                        :label="$t('queries')"
                        :selected="true"
                      >
                        <div
                          v-for="field in filteredQueryFields"
                          :key="field.name"
                        >
                          <GraphqlField
                            :gql-field="field"
                            :jump-type-callback="handleJumpToType"
                          />
                        </div>
                      </SmartTab>

                      <SmartTab
                        v-if="mutationFields.length > 0"
                        :id="'mutations'"
                        :label="$t('mutations')"
                      >
                        <div
                          v-for="field in filteredMutationFields"
                          :key="field.name"
                        >
                          <GraphqlField
                            :gql-field="field"
                            :jump-type-callback="handleJumpToType"
                          />
                        </div>
                      </SmartTab>

                      <SmartTab
                        v-if="subscriptionFields.length > 0"
                        :id="'subscriptions'"
                        :label="$t('subscriptions')"
                      >
                        <div
                          v-for="field in filteredSubscriptionFields"
                          :key="field.name"
                        >
                          <GraphqlField
                            :gql-field="field"
                            :jump-type-callback="handleJumpToType"
                          />
                        </div>
                      </SmartTab>

                      <SmartTab
                        v-if="graphqlTypes.length > 0"
                        :id="'types'"
                        ref="typesTab"
                        :label="$t('types')"
                      >
                        <div
                          v-for="type in filteredGraphqlTypes"
                          :key="type.name"
                        >
                          <GraphqlType
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
                        </div>
                      </SmartTab>
                    </div>
                  </SmartTabs>
                </section>
                <p
                  v-if="
                    queryFields.length === 0 &&
                    mutationFields.length === 0 &&
                    subscriptionFields.length === 0 &&
                    graphqlTypes.length === 0
                  "
                  class="info"
                >
                  {{ $t("send_request_first") }}
                </p>
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
          </SmartTabs>
        </aside>
      </TranslateSlideLeft>

      <SmartHideMenu
        :active="activeSidebar"
        @toggle="activeSidebar = !activeSidebar"
      />
    </div>
    <CollectionsSaveRequest
      mode="graphql"
      :show="showSaveRequestModal"
      :editing-request="editRequest"
      @hide-modal="hideRequestModal"
    />
  </div>
</template>

<script>
import * as gql from "graphql"
import { commonHeaders } from "~/helpers/headers"
import { getPlatformSpecialKey } from "~/helpers/platformutils"
import { sendNetworkRequest } from "~/helpers/network"
import { getSettingSubject } from "~/newstore/settings"
import { addGraphqlHistoryEntry } from "~/newstore/history"

export default {
  beforeRouteLeave(_to, _from, next) {
    this.isPollingSchema = false
    if (this.timeoutSubscription) clearTimeout(this.timeoutSubscription)

    next()
  },
  data() {
    return {
      commonHeaders,
      queryFields: [],
      mutationFields: [],
      subscriptionFields: [],
      graphqlTypes: [],
      copyButton: '<i class="material-icons">content_copy</i>',
      downloadButton: '<i class="material-icons">save_alt</i>',
      doneButton: '<i class="material-icons">done</i>',
      expandResponse: false,
      responseBodyMaxLines: 16,
      graphqlFieldsFilterText: undefined,
      isPollingSchema: false,
      timeoutSubscription: null,
      activeSidebar: true,
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
    editingRequest() {
      return this.$store.state.postwoman.editingRequest
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
    doPrettifyQuery() {
      this.$refs.queryEditor.prettifyQuery()
    },
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
      this.$refs.copySchemaCode.innerHTML = this.doneButton
      const aux = document.createElement("textarea")
      aux.innerText = this.schema
      document.body.appendChild(aux)
      aux.select()
      document.execCommand("copy")
      document.body.removeChild(aux)
      this.$toast.success(this.$t("copied_to_clipboard"), {
        icon: "done",
      })
      setTimeout(
        () => (this.$refs.copySchemaCode.innerHTML = this.copyButton),
        1000
      )
    },
    copyQuery() {
      this.$refs.copyQueryButton.innerHTML = this.doneButton
      const aux = document.createElement("textarea")
      aux.innerText = this.gqlQueryString
      document.body.appendChild(aux)
      aux.select()
      document.execCommand("copy")
      document.body.removeChild(aux)
      this.$toast.success(this.$t("copied_to_clipboard"), {
        icon: "done",
      })
      setTimeout(
        () => (this.$refs.copyQueryButton.innerHTML = this.copyButton),
        1000
      )
    },
    copyResponse() {
      this.$refs.copyResponseButton.innerHTML = this.doneButton
      const aux = document.createElement("textarea")
      aux.innerText = this.response
      document.body.appendChild(aux)
      aux.select()
      document.execCommand("copy")
      document.body.removeChild(aux)
      this.$toast.success(this.$t("copied_to_clipboard"), {
        icon: "done",
      })
      setTimeout(
        () => (this.$refs.copyResponseButton.innerHTML = this.copyButton),
        1000
      )
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
        this.$toast.info(this.$t("finished_in", { duration }), {
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
    ToggleExpandResponse() {
      this.expandResponse = !this.expandResponse
      this.responseBodyMaxLines =
        this.responseBodyMaxLines === Infinity ? 16 : Infinity
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
      this.$refs.downloadResponse.innerHTML = this.doneButton
      this.$toast.success(this.$t("download_started"), {
        icon: "done",
      })
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        this.$refs.downloadResponse.innerHTML = this.downloadButton
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
      this.$refs.downloadSchema.innerHTML = this.doneButton
      this.$toast.success(this.$t("download_started"), {
        icon: "done",
      })
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        this.$refs.downloadSchema.innerHTML = this.downloadButton
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
}
</script>

<style scoped lang="scss">
.gqlTabs {
  max-height: calc(100vh - 192px);
  position: relative;
  @apply overflow-auto;
}
.gqlRunQuery {
  @apply mb-8;
}
</style>
