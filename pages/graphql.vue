<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <pw-section class="blue" label="Endpoint" ref="endpoint">
          <ul>
            <li>
              <label for="url">URL</label>
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
                  Get Schema
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
                <label for="headerList">Header List</label>
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
              <input
                :placeholder="'header ' + (index + 1)"
                :name="'header' + index"
                :value="header.key"
                @change="
                  $store.commit('setGQLHeaderKey', {
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
                <span>Add New</span>
              </button>
            </li>
          </ul>
        </pw-section>

        <pw-section class="green" label="Schema" ref="schema">
          <div class="flex-wrap">
            <label>response</label>
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
                <i class="material-icons" v-if="!expandResponse">unfold_more</i>
                <i class="material-icons" v-else>unfold_less</i>
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
            <label for="gqlQuery">Query</label>
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
          <textarea
            id="gqlQuery"
            rows="8"
            v-model="gqlQueryString">
          ></textarea>
        </pw-section>
        <pw-section class="purple" label="Response" ref="response">
          <div class="flex-wrap">
            <label for="responseField">Response</label>
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
            <label v-if="queryFields.length > 0" for="queries-tab"
              >Queries</label
            >
            <div v-if="queryFields.length > 0" class="tab">
              <div v-for="field in queryFields" :key="field.name">
                <gql-field :gqlField="field" />
              </div>
            </div>

            <input
              v-if="mutationFields.length > 0"
              id="mutations-tab"
              type="radio"
              name="side"
              checked="checked"
            />
            <label v-if="mutationFields.length > 0" for="mutations-tab"
              >Mutations</label
            >
            <div v-if="mutationFields.length > 0" class="tab">
              <div v-for="field in mutationFields" :key="field.name">
                <gql-field :gqlField="field" />
              </div>
            </div>

            <input
              v-if="subscriptionFields.length > 0"
              id="subscriptions-tab"
              type="radio"
              name="side"
              checked="checked"
            />
            <label v-if="subscriptionFields.length > 0" for="subscriptions-tab"
              >Subscriptions</label
            >
            <div v-if="subscriptionFields.length > 0" class="tab">
              <div v-for="field in subscriptionFields" :key="field.name">
                <gql-field :gqlField="field" />
              </div>
            </div>

            <input
              v-if="gqlTypes.length > 0"
              id="gqltypes-tab"
              type="radio"
              name="side"
              checked="checked"
            />
            <label v-if="gqlTypes.length > 0" for="gqltypes-tab">Types</label>
            <div v-if="gqlTypes.length > 0" class="tab">
              <div v-for="type in gqlTypes" :key="type.name">
                <gql-type :gqlType="type" />
              </div>
            </div>
          </section>
        </pw-section>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tab {
  max-height: calc(100vh - 172px);
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
    Editor: AceEditor
  },
  data() {
    return {
      schemaString: "",
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

      try {
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
          data: JSON.stringify({ query: this.gqlQueryString })
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
      console.log(oldHeaders);
    }
  }
};
</script>
