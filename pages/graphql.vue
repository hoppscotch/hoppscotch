<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <pw-section class="blue" :label="$t('endpoint')" ref="endpoint" no-legend>
          <ul>
            <li>
              <label for="url">{{ $t("url") }}</label>
              <input
                id="url"
                type="url"
                v-model="url"
                spellcheck="false"
                @keyup.enter="onPollSchemaClick()"
                class="md:rounded-bl-lg"
                :placeholder="$t('url')"
              />
            </li>
            <div>
              <li>
                <label for="get" class="hide-on-small-screen">&nbsp;</label>
                <button
                  id="get"
                  name="get"
                  @click="onPollSchemaClick"
                  class="rounded-b-lg md:rounded-bl-none md:rounded-br-lg"
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
        </pw-section>

        <pw-section class="orange" :label="$t('headers')" ref="headers" no-legend>
          <div class="flex flex-col">
            <label>{{ $t("headers") }}</label>
            <ul v-if="headers.length !== 0">
              <li>
                <div class="row-wrapper">
                  <label for="headerList">{{ $t("header_list") }}</label>
                  <div>
                    <button class="icon" @click="headers = []" v-tooltip.bottom="$t('clear')">
                      <i class="material-icons">clear_all</i>
                    </button>
                  </div>
                </div>
              </li>
            </ul>
            <ul
              v-for="(header, index) in headers"
              :key="`${header.value}_${index}`"
              class="border-b border-dashed divide-y md:divide-x border-brdColor divide-dashed divide-brdColor md:divide-y-0"
              :class="{ 'border-t': index == 0 }"
            >
              <li>
                <autocomplete
                  :placeholder="$t('header_count', { count: index + 1 })"
                  :source="commonHeaders"
                  :spellcheck="false"
                  :value="header.key"
                  @input="
                    $store.commit('setGQLHeaderKey', {
                      index,
                      value: $event,
                    })
                  "
                  autofocus
                />
              </li>
              <li>
                <input
                  :placeholder="$t('value_count', { count: index + 1 })"
                  :name="`value ${index}`"
                  :value="header.value"
                  @change="
                    $store.commit('setGQLHeaderValue', {
                      index,
                      value: $event.target.value,
                    })
                  "
                  autofocus
                />
              </li>
              <div>
                <li>
                  <button
                    class="icon"
                    @click="
                      $store.commit('setActiveGQLHeader', {
                        index,
                        value: header.hasOwnProperty('active') ? !header.active : false,
                      })
                    "
                    v-tooltip.bottom="{
                      content: header.hasOwnProperty('active')
                        ? header.active
                          ? $t('turn_off')
                          : $t('turn_on')
                        : $t('turn_off'),
                    }"
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
                    class="icon"
                    @click="removeRequestHeader(index)"
                    v-tooltip.bottom="$t('delete')"
                  >
                    <i class="material-icons">delete</i>
                  </button>
                </li>
              </div>
            </ul>
            <ul>
              <li>
                <button class="icon" @click="addRequestHeader">
                  <i class="material-icons">add</i>
                  <span>{{ $t("add_new") }}</span>
                </button>
              </li>
            </ul>
          </div>
        </pw-section>

        <pw-section class="green" :label="$t('schema')" ref="schema" no-legend>
          <div class="row-wrapper">
            <label>{{ $t("schema") }}</label>
            <div v-if="schema">
              <button
                class="icon"
                @click="ToggleExpandResponse"
                ref="ToggleExpandResponse"
                v-tooltip="{
                  content: !expandResponse ? $t('expand_response') : $t('collapse_response'),
                }"
              >
                <i class="material-icons">
                  {{ !expandResponse ? "unfold_more" : "unfold_less" }}
                </i>
              </button>
              <button
                class="icon"
                @click="downloadSchema"
                ref="downloadSchema"
                v-tooltip="$t('download_file')"
              >
                <i class="material-icons">save_alt</i>
              </button>
              <button
                class="icon"
                ref="copySchemaCode"
                @click="copySchema"
                v-tooltip="$t('copy_schema')"
              >
                <i class="material-icons">content_copy</i>
              </button>
            </div>
          </div>
          <ace-editor
            v-if="schema"
            :value="schema"
            :lang="'graphqlschema'"
            :options="{
              maxLines: responseBodyMaxLines,
              minLines: 16,
              fontSize: '16px',
              autoScrollEditorIntoView: true,
              readOnly: true,
              showPrintMargin: false,
              useWorker: false,
            }"
            styles="rounded-b-lg"
          />
          <input
            v-else
            class="rounded-b-lg missing-data-response"
            :value="$t('waiting_receive_schema')"
            ref="status"
            name="status"
            readonly
            type="text"
          />
        </pw-section>

        <pw-section class="teal" :label="$t('query')" ref="query" no-legend>
          <div class="row-wrapper gqlRunQuery">
            <label for="gqlQuery">{{ $t("query") }}</label>
            <div>
              <button
                @click="runQuery()"
                v-tooltip.bottom="`${$t('run_query')} (${getSpecialKey()}-Enter)`"
              >
                <i class="material-icons">play_arrow</i>
              </button>
              <button
                class="icon"
                @click="copyQuery"
                ref="copyQueryButton"
                v-tooltip="$t('copy_query')"
              >
                <i class="material-icons">content_copy</i>
              </button>
              <button
                class="icon"
                @click="doPrettifyQuery"
                v-tooltip="`${$t('prettify_query')} (${getSpecialKey()}-P)`"
              >
                <i class="material-icons">photo_filter</i>
              </button>
            </div>
          </div>
          <queryeditor
            ref="queryEditor"
            v-model="gqlQueryString"
            :onRunGQLQuery="runQuery"
            :options="{
              maxLines: responseBodyMaxLines,
              minLines: 10,
              fontSize: '16px',
              autoScrollEditorIntoView: true,
              showPrintMargin: false,
              useWorker: false,
            }"
            styles="rounded-b-lg"
          />
        </pw-section>

        <pw-section class="yellow" :label="$t('variables')" ref="variables" no-legend>
          <div class="flex flex-col">
            <label>{{ $t("variables") }}</label>
            <ace-editor
              v-model="variableString"
              :lang="'json'"
              :options="{
                maxLines: 10,
                minLines: 5,
                fontSize: '16px',
                autoScrollEditorIntoView: true,
                showPrintMargin: false,
                useWorker: false,
              }"
              styles="rounded-b-lg"
            />
          </div>
        </pw-section>

        <pw-section class="purple" :label="$t('response')" ref="response" no-legend>
          <div class="flex flex-col">
            <label>{{ $t("response") }}</label>
            <div class="row-wrapper">
              <label for="responseField">{{ $t("response_body") }}</label>
              <div>
                <button
                  class="icon"
                  @click="downloadResponse"
                  ref="downloadResponse"
                  v-if="response"
                  v-tooltip="$t('download_file')"
                >
                  <i class="material-icons">save_alt</i>
                </button>
                <button
                  class="icon"
                  @click="copyResponse"
                  ref="copyResponseButton"
                  v-if="response"
                  v-tooltip="$t('copy_response')"
                >
                  <i class="material-icons">content_copy</i>
                </button>
              </div>
            </div>
            <ace-editor
              v-if="response"
              :value="response"
              :lang="'json'"
              :lint="false"
              :options="{
                maxLines: responseBodyMaxLines,
                minLines: 10,
                fontSize: '16px',
                autoScrollEditorIntoView: true,
                readOnly: true,
                showPrintMargin: false,
                useWorker: false,
              }"
              styles="rounded-b-lg"
            />
            <input
              v-else
              class="rounded-b-lg missing-data-response"
              :value="$t('waiting_receive_response')"
              ref="status"
              name="status"
              readonly
              type="text"
            />
          </div>
        </pw-section>
      </div>

      <aside class="sticky-inner inner-right lg:max-w-md">
        <pw-section class="purple" :label="$t('docs')" ref="docs" no-legend>
          <section class="flex-col">
            <input
              type="text"
              :placeholder="$t('search')"
              v-model="graphqlFieldsFilterText"
              class="rounded-t-lg"
            />
            <tabs ref="gqlTabs" styles="m-4">
              <div class="gqlTabs">
                <tab
                  v-if="queryFields.length > 0"
                  :id="'queries'"
                  :label="$t('queries')"
                  :selected="true"
                >
                  <div v-for="field in filteredQueryFields" :key="field.name">
                    <field :gqlField="field" :jumpTypeCallback="handleJumpToType" />
                  </div>
                </tab>

                <tab v-if="mutationFields.length > 0" :id="'mutations'" :label="$t('mutations')">
                  <div v-for="field in filteredMutationFields" :key="field.name">
                    <field :gqlField="field" :jumpTypeCallback="handleJumpToType" />
                  </div>
                </tab>

                <tab
                  v-if="subscriptionFields.length > 0"
                  :id="'subscriptions'"
                  :label="$t('subscriptions')"
                >
                  <div v-for="field in filteredSubscriptionFields" :key="field.name">
                    <field :gqlField="field" :jumpTypeCallback="handleJumpToType" />
                  </div>
                </tab>

                <tab
                  v-if="graphqlTypes.length > 0"
                  :id="'types'"
                  :label="$t('types')"
                  ref="typesTab"
                >
                  <div v-for="type in filteredGraphqlTypes" :key="type.name">
                    <type
                      :gqlType="type"
                      :isHighlighted="isGqlTypeHighlighted({ gqlType: type })"
                      :highlightedFields="getGqlTypeHighlightedFields({ gqlType: type })"
                      :jumpTypeCallback="handleJumpToType"
                    />
                  </div>
                </tab>
              </div>
            </tabs>
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
        </pw-section>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.gqlTabs {
  max-height: calc(100vh - 192px);
  @apply overflow-auto;
}
.gqlRunQuery {
  @apply mb-8;
}
</style>

<script>
import * as gql from "graphql"
import { commonHeaders } from "~/helpers/headers"
import { getPlatformSpecialKey } from "~/helpers/platformutils"
import { sendNetworkRequest } from "~/helpers/network"

export default {
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

      settings: {
        SCROLL_INTO_ENABLED:
          typeof this.$store.state.postwoman.settings.SCROLL_INTO_ENABLED !== "undefined"
            ? this.$store.state.postwoman.settings.SCROLL_INTO_ENABLED
            : true,
      },
    }
  },
  computed: {
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
  mounted() {
    if (this.$store.state.gql.schemaIntrospection && this.$store.state.gql.schema) {
      const gqlSchema = gql.buildClientSchema(JSON.parse(this.$store.state.gql.schemaIntrospection))
      this.getDocsFromSchema(gqlSchema)
    }
  },
  beforeRouteLeave(_to, _from, next) {
    this.isPollingSchema = false
    if (this.timeoutSubscription) clearTimeout(this.timeoutSubscription)

    next()
  },
  methods: {
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
      const isFilterTextFoundInName = graphqlFieldObject.name.toLowerCase().includes(normalizedText)

      return isFilterTextFoundInDescription || isFilterTextFoundInName
    },
    getFilteredGraphqlFields({ filterText, fields }) {
      if (!filterText) return fields

      return fields.filter((field) =>
        this.isTextFoundInGraphqlFieldObject({ text: filterText, graphqlFieldObject: field })
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

        const isFilterTextMatchingAtLeastOneField = Object.values(type._fields || {}).some(
          (field) =>
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
    handleJumpToType(type) {
      this.$refs.gqlTabs.selectTab(this.$refs.typesTab)

      const rootTypeName = this.resolveRootType(type).name

      const target = document.getElementById(`type_${rootTypeName}`)
      if (target && this.settings.SCROLL_INTO_ENABLED) {
        target.scrollIntoView({
          behavior: "smooth",
        })
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
      setTimeout(() => (this.$refs.copySchemaCode.innerHTML = this.copyButton), 1000)
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
      setTimeout(() => (this.$refs.copyQueryButton.innerHTML = this.copyButton), 1000)
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
      setTimeout(() => (this.$refs.copyResponseButton.innerHTML = this.copyButton), 1000)
    },
    async runQuery() {
      const startTime = Date.now()

      // Start showing the loading bar as soon as possible.
      // The nuxt axios module will hide it when the request is made.
      this.$nuxt.$loading.start()

      this.response = this.$t("loading")
      if (this.settings.SCROLL_INTO_ENABLED) this.scrollInto("response")

      try {
        let headers = {}
        this.headers
          .filter((item) => (item.hasOwnProperty("active") ? item.active == true : true))
          .forEach(({ key, value }) => {
            headers[key] = value
          })

        let variables = JSON.parse(this.variableString || "{}")

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

        const res = await sendNetworkRequest(reqOptions, this.$store)

        // HACK: Temporary trailing null character issue from the extension fix
        const responseText = new TextDecoder("utf-8").decode(res.data).replace(/\0+$/, "")

        this.response = JSON.stringify(JSON.parse(responseText), null, 2)

        this.$nuxt.$loading.finish()
        const duration = Date.now() - startTime
        this.$toast.info(this.$t("finished_in", { duration }), {
          icon: "done",
        })
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

      const queryTypeName = schema.getQueryType() ? schema.getQueryType().name : ""
      const mutationTypeName = schema.getMutationType() ? schema.getMutationType().name : ""
      const subscriptionTypeName = schema.getSubscriptionType()
        ? schema.getSubscriptionType().name
        : ""

      for (const type in typeMap) {
        if (
          !typeMap[type].name.startsWith("__") &&
          ![queryTypeName, mutationTypeName, subscriptionTypeName].includes(typeMap[type].name) &&
          typeMap[type] instanceof gql.GraphQLObjectType
        ) {
          types.push(typeMap[type])
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

        let headers = {}
        this.headers
          .filter((item) => (item.hasOwnProperty("active") ? item.active == true : true))
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
        const response = new TextDecoder("utf-8").decode(data.data).replace(/\0+$/, "")
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
      } catch (error) {
        this.$nuxt.$loading.finish()

        this.schema = `${error}. ${this.$t("check_console_details")}`
        this.$toast.error(
          `${this.$t("graphql_introspect_failed")} ${this.$t("check_graphql_valid")}`,
          {
            icon: "error",
          }
        )
        console.log("Error", error)
      }

      this.$nuxt.$loading.finish()

      if (this.isPollingSchema) this.timeoutSubscription = setTimeout(this.pollSchema, 7000)
    },
    async getSchema() {
      const startTime = Date.now()

      // Start showing the loading bar as soon as possible.
      // The nuxt axios module will hide it when the request is made.
      this.$nuxt.$loading.start()

      this.schema = this.$t("loading")
      if (this.settings.SCROLL_INTO_ENABLED) this.scrollInto("schema")

      try {
        const query = JSON.stringify({
          query: gql.getIntrospectionQuery(),
        })

        let headers = {}
        this.headers
          .filter((item) => (item.hasOwnProperty("active") ? item.active == true : true))
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
        const response = new TextDecoder("utf-8").decode(data.data).replace(/\0+$/, "")
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
          `${this.$t("graphql_introspect_failed")} ${this.$t("check_graphql_valid")}`,
          {
            icon: "error",
          }
        )
        console.log("Error", error)
      }
    },
    ToggleExpandResponse() {
      this.expandResponse = !this.expandResponse
      this.responseBodyMaxLines = this.responseBodyMaxLines == Infinity ? 16 : Infinity
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
    addRequestHeader(index) {
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
          onClick: (e, toastObject) => {
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
  },
  head() {
    return {
      title: `GraphQL • Hoppscotch`,
    }
  },
}
</script>
