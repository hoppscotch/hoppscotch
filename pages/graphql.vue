<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <pw-section class="blue" label="Endpoint" ref="endpoint">
          <ul>
            <li>
              <label for="url">{{ $t("url") }}</label>
              <input
                id="url"
                type="url"
                v-model="url"
                @keyup.enter="getSchema()"
              />
            </li>
            <div>
              <li>
                <label for="get" class="hide-on-small-screen">&nbsp;</label>
                <button id="get" name="get" @click="getSchema">
                  {{ $t("get_schema") }}
                  <span><i class="material-icons">send</i></span>
                </button>
              </li>
            </div>
          </ul>
        </pw-section>

        <pw-section class="orange" label="Headers" ref="headers">
          <ul>
            <li>
              <div class="flex-wrap">
                <label for="headerList">{{ $t("header_list") }}</label>
                <div>
                  <button
                    class="icon"
                    @click="headers = []"
                    v-tooltip.bottom="'Clear'"
                  >
                    <i class="material-icons">clear_all</i>
                  </button>
                </div>
              </div>
              <textarea
                id="headerList"
                readonly
                v-textarea-auto-height="headerString"
                v-model="headerString"
                placeholder="(add at least one header)"
                rows="1"
              ></textarea>
            </li>
          </ul>
          <ul v-for="(header, index) in headers" :key="index">
            <li>
              <autocomplete
                :placeholder="'header ' + (index + 1)"
                :source="commonHeaders"
                :spellcheck="false"
                :value="header.key"
                @input="
                  $store.commit('setGQLHeaderKey', {
                    index,
                    value: $event
                  })
                "
                autofocus
              />
            </li>
            <li>
              <input
                :placeholder="'value ' + (index + 1)"
                :name="'value' + index"
                :value="header.value"
                @change="
                  $store.commit('setGQLHeaderValue', {
                    index,
                    value: $event.target.value
                  })
                "
                autofocus
              />
            </li>
            <div>
              <li>
                <button
                  class="icon"
                  @click="removeRequestHeader(index)"
                  id="header"
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
        </pw-section>

        <pw-section class="green" label="Schema" ref="schema">
          <div class="flex-wrap">
            <label>{{ $t("response") }}</label>
            <div>
              <button
                class="icon"
                @click="ToggleExpandResponse"
                ref="ToggleExpandResponse"
                v-tooltip="{
                  content: !expandResponse
                    ? 'Expand response'
                    : 'Collapse response'
                }"
              >
                <i class="material-icons">
                  {{ !expandResponse ? "unfold_more" : "unfold_less" }}
                </i>
              </button>
              <button
                class="icon"
                @click="downloadResponse"
                ref="downloadResponse"
                v-tooltip="'Download file'"
              >
                <i class="material-icons">get_app</i>
              </button>
              <button
                class="icon"
                ref="copySchemaCode"
                @click="copySchema"
                v-tooltip="'Copy Schema'"
              >
                <i class="material-icons">file_copy</i>
              </button>
            </div>
          </div>
          <Editor
            :value="schemaString"
            :lang="'graphqlschema'"
            :options="{
              maxLines: responseBodyMaxLines,
              minLines: '16',
              fontSize: '16px',
              autoScrollEditorIntoView: true,
              readOnly: true,
              showPrintMargin: false,
              useWorker: false
            }"
          />
        </pw-section>

        <pw-section class="cyan" label="Query" ref="query">
          <div class="flex-wrap">
            <label for="gqlQuery">{{ $t("query") }}</label>
            <div>
              <button
                class="icon"
                @click="runQuery()"
                v-tooltip.bottom="'Run Query'"
              >
                <i class="material-icons">play_arrow</i>
              </button>
              <button
                class="icon"
                @click="copyQuery"
                ref="copyQueryButton"
                v-tooltip="'Copy Query'"
              >
                <i class="material-icons">file_copy</i>
              </button>
            </div>
          </div>
          <Editor
            v-model="gqlQueryString"
            :options="{
              maxLines: responseBodyMaxLines,
              minLines: '16',
              fontSize: '16px',
              autoScrollEditorIntoView: true,
              showPrintMargin: false,
              useWorker: false
            }"
          />
          <div class="flex-wrap">
            <label>{{ $t("query_variables") }}</label>
            <div>
              <button
                class="icon"
                @click="variables = []"
                v-tooltip.bottom="'Clear'"
              >
                <i class="material-icons">clear_all</i>
              </button>
            </div>
          </div>
          <ul v-for="(variable, index) in variables" :key="index">
            <li>
              <input
                :placeholder="'variable ' + (index + 1)"
                :name="'variable_key_' + index"
                :value="variable.key"
                @change="
                  $store.commit('setGQLVariableKey', {
                    index,
                    value: $event.target.value
                  })
                "
                autofocus
              />
            </li>
            <li>
              <input
                :placeholder="'value ' + (index + 1)"
                :name="'variable_value_' + index"
                :value="variable.value"
                @change="
                  $store.commit('setGQLVariableValue', {
                    index,
                    value: $event.target.value
                  })
                "
                autofocus
              />
            </li>
            <div>
              <li>
                <button class="icon" @click="removeQueryVariable(index)">
                  <i class="material-icons">delete</i>
                </button>
              </li>
            </div>
          </ul>
          <ul>
            <li>
              <button class="icon" @click="addQueryVariable">
                <i class="material-icons">add</i>
                <span>{{ $t("add_new") }}</span>
              </button>
            </li>
          </ul>
        </pw-section>

        <pw-section class="purple" label="Response" ref="response">
          <div class="flex-wrap">
            <label for="responseField">{{ $t("response") }}</label>
            <div>
              <button
                class="icon"
                @click="copyResponse"
                ref="copyResponseButton"
                v-tooltip="'Copy Response'"
              >
                <i class="material-icons">file_copy</i>
              </button>
            </div>
          </div>
          <Editor
            :value="responseString"
            :lang="'json'"
            :options="{
              maxLines: responseBodyMaxLines,
              minLines: '16',
              fontSize: '16px',
              autoScrollEditorIntoView: true,
              readOnly: true,
              showPrintMargin: false,
              useWorker: false
            }"
          />
        </pw-section>
      </div>
      <aside class="sticky-inner inner-right">
        <pw-section class="purple" label="Docs" ref="docs">
          <section>
            <input
              v-if="queryFields.length > 0"
              id="queries-tab"
              type="radio"
              name="side"
              checked="checked"
            />
            <label v-if="queryFields.length > 0" for="queries-tab">
              {{ $t("queries") }}
            </label>
            <div v-if="queryFields.length > 0" class="tab">
              <div v-for="field in queryFields" :key="field.name">
                <gql-field
                  :gqlField="field"
                  :jumpTypeCallback="handleJumpToType"
                />
              </div>
            </div>

            <input
              v-if="mutationFields.length > 0"
              id="mutations-tab"
              type="radio"
              name="side"
              checked="checked"
            />
            <label v-if="mutationFields.length > 0" for="mutations-tab">
              {{ $t("mutations") }}
            </label>
            <div v-if="mutationFields.length > 0" class="tab">
              <div v-for="field in mutationFields" :key="field.name">
                <gql-field
                  :gqlField="field"
                  :jumpTypeCallback="handleJumpToType"
                />
              </div>
            </div>

            <input
              v-if="subscriptionFields.length > 0"
              id="subscriptions-tab"
              type="radio"
              name="side"
              checked="checked"
            />
            <label v-if="subscriptionFields.length > 0" for="subscriptions-tab">
              {{ $t("subscriptions") }}
            </label>
            <div v-if="subscriptionFields.length > 0" class="tab">
              <div v-for="field in subscriptionFields" :key="field.name">
                <gql-field
                  :gqlField="field"
                  :jumpTypeCallback="handleJumpToType"
                />
              </div>
            </div>

            <input
              v-if="gqlTypes.length > 0"
              id="gqltypes-tab"
              type="radio"
              name="side"
              checked="checked"
            />
            <label v-if="gqlTypes.length > 0" for="gqltypes-tab">
              {{ $t("types") }}
            </label>
            <div v-if="gqlTypes.length > 0" class="tab">
              <div
                v-for="type in gqlTypes"
                :key="type.name"
                :id="`type_${type.name}`"
              >
                <gql-type
                  :gqlType="type"
                  :jumpTypeCallback="handleJumpToType"
                />
              </div>
            </div>
          </section>

          <p
            v-if="
              queryFields.length === 0 &&
                mutationFields.length === 0 &&
                subscriptionFields.length === 0 &&
                gqlTypes.length === 0
            "
            class="info"
          >
            Send a request first
          </p>
        </pw-section>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tab {
  max-height: calc(100vh - 186px);
  overflow: auto;
}
</style>

<script>
import axios from "axios";
import * as gql from "graphql";
import textareaAutoHeight from "../directives/textareaAutoHeight";
import AceEditor from "../components/ace-editor";

export default {
  directives: {
    textareaAutoHeight
  },
  components: {
    "pw-section": () => import("../components/section"),
    "gql-field": () => import("../components/graphql/field"),
    "gql-type": () => import("../components/graphql/type"),
    autocomplete: () => import("../components/autocomplete"),
    Editor: AceEditor
  },
  data() {
    return {
      schemaString: "",
      commonHeaders: [
        "WWW-Authenticate",
        "Authorization",
        "Proxy-Authenticate",
        "Proxy-Authorization",
        "Age",
        "Cache-Control",
        "Clear-Site-Data",
        "Expires",
        "Pragma",
        "Warning",
        "Accept-CH",
        "Accept-CH-Lifetime",
        "Early-Data",
        "Content-DPR",
        "DPR",
        "Device-Memory",
        "Save-Data",
        "Viewport-Width",
        "Width",
        "Last-Modified",
        "ETag",
        "If-Match",
        "If-None-Match",
        "If-Modified-Since",
        "If-Unmodified-Since",
        "Vary",
        "Connection",
        "Keep-Alive",
        "Accept",
        "Accept-Charset",
        "Accept-Encoding",
        "Accept-Language",
        "Expect",
        "Max-Forwards",
        "Cookie",
        "Set-Cookie",
        "Cookie2",
        "Set-Cookie2",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials",
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Methods",
        "Access-Control-Expose-Headers",
        "Access-Control-Max-Age",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method",
        "Origin",
        "Service-Worker-Allowed",
        "Timing-Allow-Origin",
        "X-Permitted-Cross-Domain-Policies",
        "DNT",
        "Tk",
        "Content-Disposition",
        "Content-Length",
        "Content-Type",
        "Content-Encoding",
        "Content-Language",
        "Content-Location",
        "Forwarded",
        "X-Forwarded-For",
        "X-Forwarded-Host",
        "X-Forwarded-Proto",
        "Via",
        "Location",
        "From",
        "Host",
        "Referer",
        "Referrer-Policy",
        "User-Agent",
        "Allow",
        "Server",
        "Accept-Ranges",
        "Range",
        "If-Range",
        "Content-Range",
        "Cross-Origin-Opener-Policy",
        "Cross-Origin-Resource-Policy",
        "Content-Security-Policy",
        "Content-Security-Policy-Report-Only",
        "Expect-CT",
        "Feature-Policy",
        "Public-Key-Pins",
        "Public-Key-Pins-Report-Only",
        "Strict-Transport-Security",
        "Upgrade-Insecure-Requests",
        "X-Content-Type-Options",
        "X-Download-Options",
        "X-Frame-Options",
        "X-Powered-By",
        "X-XSS-Protection",
        "Last-Event-ID",
        "NEL",
        "Ping-From",
        "Ping-To",
        "Report-To",
        "Transfer-Encoding",
        "TE",
        "Trailer",
        "Sec-WebSocket-Key",
        "Sec-WebSocket-Extensions",
        "Sec-WebSocket-Accept",
        "Sec-WebSocket-Protocol",
        "Sec-WebSocket-Version",
        "Accept-Push-Policy",
        "Accept-Signature",
        "Alt-Svc",
        "Date",
        "Large-Allocation",
        "Link",
        "Push-Policy",
        "Retry-After",
        "Signature",
        "Signed-Headers",
        "Server-Timing",
        "SourceMap",
        "Upgrade",
        "X-DNS-Prefetch-Control",
        "X-Firefox-Spdy",
        "X-Pingback",
        "X-Requested-With",
        "X-Robots-Tag",
        "X-UA-Compatible"
      ],
      queryFields: [],
      mutationFields: [],
      subscriptionFields: [],
      gqlTypes: [],
      responseString: "",
      copyButton: '<i class="material-icons">file_copy</i>',
      downloadButton: '<i class="material-icons">get_app</i>',
      doneButton: '<i class="material-icons">done</i>',
      expandResponse: false,
      responseBodyMaxLines: 16
    };
  },
  computed: {
    url: {
      get() {
        return this.$store.state.gql.url;
      },
      set(value) {
        this.$store.commit("setGQLState", { value, attribute: "url" });
      }
    },
    headers: {
      get() {
        return this.$store.state.gql.headers;
      },
      set(value) {
        this.$store.commit("setGQLState", { value, attribute: "headers" });
      }
    },
    variables: {
      get() {
        return this.$store.state.gql.variables;
      },
      set(value) {
        this.$store.commit("setGQLState", { value, attribute: "variables" });
      }
    },
    gqlQueryString: {
      get() {
        return this.$store.state.gql.query;
      },
      set(value) {
        this.$store.commit("setGQLState", { value, attribute: "query" });
      }
    },
    headerString() {
      const result = this.headers
        .filter(({ key }) => !!key)
        .map(({ key, value }) => `${key}: ${value}`)
        .join(",\n");
      return result === "" ? "" : `${result}`;
    }
  },
  methods: {
    handleJumpToType(type) {
      const typesTab = document.getElementById("gqltypes-tab");
      typesTab.checked = true;

      const rootTypeName = this.resolveRootType(type).name;

      const target = document.getElementById(`type_${rootTypeName}`);
      if (target) {
        target.scrollIntoView({
          behavior: "smooth"
        });
      }
    },
    resolveRootType(type) {
      let t = type;
      while (t.ofType != null) t = t.ofType;
      return t;
    },
    copySchema() {
      this.$refs.copySchemaCode.innerHTML = this.doneButton;
      const aux = document.createElement("textarea");
      aux.innerText = this.schemaString;
      document.body.appendChild(aux);
      aux.select();
      document.execCommand("copy");
      document.body.removeChild(aux);
      this.$toast.success("Copied to clipboard", {
        icon: "done"
      });
      setTimeout(
        () => (this.$refs.copySchemaCode.innerHTML = this.copyButton),
        1000
      );
    },
    copyQuery() {
      this.$refs.copyQueryButton.innerHTML = this.doneButton;
      const aux = document.createElement("textarea");
      aux.innerText = this.gqlQueryString;
      document.body.appendChild(aux);
      aux.select();
      document.execCommand("copy");
      document.body.removeChild(aux);
      this.$toast.success("Copied to clipboard", {
        icon: "done"
      });
      setTimeout(
        () => (this.$refs.copyQueryButton.innerHTML = this.copyButton),
        1000
      );
    },
    copyResponse() {
      this.$refs.copyResponseButton.innerHTML = this.doneButton;
      const aux = document.createElement("textarea");
      aux.innerText = this.responseString;
      document.body.appendChild(aux);
      aux.select();
      document.execCommand("copy");
      document.body.removeChild(aux);
      this.$toast.success("Copied to clipboard", {
        icon: "done"
      });
      setTimeout(
        () => (this.$refs.copyResponseButton.innerHTML = this.copyButton),
        1000
      );
    },
    async runQuery() {
      const startTime = Date.now();

      this.$nuxt.$loading.start();
      this.scrollInto("response");

      try {
        let headers = {};
        this.headers.forEach(header => {
          headers[header.key] = header.value;
        });

        let variables = {};
        const gqlQueryString = this.gqlQueryString;
        this.variables.forEach(variable => {
          // todo: better variable type validation
          const intRex = new RegExp(`\$${variable.key}\: Int`);
          intRex.compile();
          const floatRex = new RegExp(`\$${variable.key}\: Float`);
          floatRex.compile();

          if (intRex.test(gqlQueryString)) {
            variables[variable.key] = parseInt(variable.value);
          } else if (floatRex.test(gqlQueryString)) {
            variables[variable.key] = parseFloat(variable.value);
          } else {
            variables[variable.key] = variable.value;
          }
        });

        const reqOptions = {
          method: "post",
          url: this.url,
          headers: {
            ...headers,
            "content-type": "application/json"
          },
          data: JSON.stringify({ query: gqlQueryString, variables })
        };

        const reqConfig = this.$store.state.postwoman.settings.PROXY_ENABLED
          ? {
              method: "post",
              url:
                this.$store.state.postwoman.settings.PROXY_URL ||
                `https://postwoman.apollotv.xyz/`,
              data: reqOptions
            }
          : reqOptions;

        const res = await axios(reqConfig);

        const data = this.$store.state.postwoman.settings.PROXY_ENABLED
          ? res.data
          : res;

        this.responseString = JSON.stringify(data.data, null, 2);

        this.$nuxt.$loading.finish();
        const duration = Date.now() - startTime;
        this.$toast.info(`Finished in ${duration}ms`, {
          icon: "done"
        });
      } catch (error) {
        this.$nuxt.$loading.finish();

        this.$toast.error(error + " (F12 for details)", {
          icon: "error"
        });
        console.log("Error", error);
      }
    },
    async getSchema() {
      const startTime = Date.now();
      this.schemaString = "Loading...";
      this.scrollInto("schema");

      // Start showing the loading bar as soon as possible.
      // The nuxt axios module will hide it when the request is made.
      this.$nuxt.$loading.start();

      try {
        const query = JSON.stringify({
          query: gql.getIntrospectionQuery()
        });

        let headers = {};
        this.headers.forEach(header => {
          headers[header.key] = header.value;
        });

        const reqOptions = {
          method: "post",
          url: this.url,
          headers: {
            ...headers,
            "content-type": "application/json"
          },
          data: query
        };

        // console.log(reqOptions);

        const reqConfig = this.$store.state.postwoman.settings.PROXY_ENABLED
          ? {
              method: "post",
              url:
                this.$store.state.postwoman.settings.PROXY_URL ||
                `https://postwoman.apollotv.xyz/`,
              data: reqOptions
            }
          : reqOptions;

        const res = await axios(reqConfig);

        const data = this.$store.state.postwoman.settings.PROXY_ENABLED
          ? res.data
          : res;

        const schema = gql.buildClientSchema(data.data.data);
        this.schemaString = gql.printSchema(schema, {
          commentDescriptions: true
        });

        if (schema.getQueryType()) {
          const fields = schema.getQueryType().getFields();
          const qFields = [];
          for (const field in fields) {
            qFields.push(fields[field]);
          }
          this.queryFields = qFields;
        }

        if (schema.getMutationType()) {
          const fields = schema.getMutationType().getFields();
          const mFields = [];
          for (const field in fields) {
            mFields.push(fields[field]);
          }
          this.mutationFields = mFields;
        }

        if (schema.getSubscriptionType()) {
          const fields = schema.getSubscriptionType().getFields();
          const sFields = [];
          for (const field in fields) {
            sFields.push(fields[field]);
          }
          this.subscriptionFields = sFields;
        }

        const typeMap = schema.getTypeMap();
        const types = [];

        const queryTypeName = schema.getQueryType()
          ? schema.getQueryType().name
          : "";
        const mutationTypeName = schema.getMutationType()
          ? schema.getMutationType().name
          : "";
        const subscriptionTypeName = schema.getSubscriptionType()
          ? schema.getSubscriptionType().name
          : "";

        for (const type in typeMap) {
          if (
            !typeMap[type].name.startsWith("__") &&
            ![queryTypeName, mutationTypeName, subscriptionTypeName].includes(
              typeMap[type].name
            ) &&
            typeMap[type] instanceof gql.GraphQLObjectType
          ) {
            types.push(typeMap[type]);
          }
        }
        this.gqlTypes = types;

        this.$nuxt.$loading.finish();
        const duration = Date.now() - startTime;
        this.$toast.info(`Finished in ${duration}ms`, {
          icon: "done"
        });
      } catch (error) {
        this.$nuxt.$loading.finish();
        this.schemaString = error + ". Check console for details.";
        this.$toast.error(error + " (F12 for details)", {
          icon: "error"
        });
        console.log("Error", error);
      }
    },
    ToggleExpandResponse() {
      this.expandResponse = !this.expandResponse;
      this.responseBodyMaxLines =
        this.responseBodyMaxLines == Infinity ? 16 : Infinity;
    },
    downloadResponse() {
      const dataToWrite = JSON.stringify(this.schemaString, null, 2);
      const file = new Blob([dataToWrite], { type: "application/json" });
      const a = document.createElement("a"),
        url = URL.createObjectURL(file);
      a.href = url;
      a.download = (this.url + " on " + Date() + ".graphql").replace(
        /\./g,
        "[dot]"
      );
      document.body.appendChild(a);
      a.click();
      this.$refs.downloadResponse.innerHTML = this.doneButton;
      this.$toast.success("Download started", {
        icon: "done"
      });
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.$refs.downloadResponse.innerHTML = this.downloadButton;
      }, 1000);
    },
    addRequestHeader(index) {
      this.$store.commit("addGQLHeader", {
        key: "",
        value: ""
      });
      return false;
    },
    removeRequestHeader(index) {
      // .slice() is used so we get a separate array, rather than just a reference
      const oldHeaders = this.headers.slice();

      this.$store.commit("removeGQLHeader", index);
      this.$toast.error("Deleted", {
        icon: "delete",
        action: {
          text: "Undo",
          duration: 4000,
          onClick: (e, toastObject) => {
            this.headers = oldHeaders;
            toastObject.remove();
          }
        }
      });
      // console.log(oldHeaders);
    },
    addQueryVariable(index) {
      this.$store.commit("addGQLVariable", {
        key: "",
        value: ""
      });
      return false;
    },
    removeQueryVariable(index) {
      const oldVariables = this.variables.slice();

      this.$store.commit("removeGQLVariable", index);
      this.$toast.error("Deleted", {
        icon: "delete",
        action: {
          text: "Undo",
          duration: 4000,
          onClick: (e, toastObject) => {
            this.variables = oldVariables;
            toastObject.remove();
          }
        }
      });
      // console.log(oldVariables);
    },
    scrollInto(view) {
      this.$refs[view].$el.scrollIntoView({
        behavior: "smooth"
      });
    }
  }
};
</script>
