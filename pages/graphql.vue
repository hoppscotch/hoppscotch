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
            <li>
              <label for="get" class="hide-on-small-screen">&nbsp;</label>
              <button id="get" name="get" @click="getSchema">
                Get Schema
                <span><i class="material-icons">send</i></span>
              </button>
            </li>
          </ul>
        </pw-section>
        <pw-section class="green" label="Schema" ref="schema">
          <Editor
            :value="schemaString"
            :lang="'graphqlschema'"
            :options="{
              maxLines: '16',
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
import AceEditor from "../components/ace-editor";

export default {
  components: {
    "pw-section": () => import("../components/section"),
    "gql-field": () => import("../components/graphql/field"),
    "gql-type": () => import("../components/graphql/type"),
    Editor: AceEditor
  },
  data() {
    return {
      url: "https://rickandmortyapi.com/graphql",
      schemaString: "",
      queryFields: [],
      mutationFields: [],
      subscriptionFields: [],
      gqlTypes: []
    };
  },
  methods: {
    getSchema() {
      const startTime = Date.now();
      this.schemaString = "Loading...";

      // Start showing the loading bar as soon as possible.
      // The nuxt axios module will hide it when the request is made.
      this.$nuxt.$loading.start();

      axios
        .post(this.url, {
          query: gql.getIntrospectionQuery()
        })
        .then(res => {
          const schema = gql.buildClientSchema(res.data.data);
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
            console.log(this.queryFields);
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
          console.log(this.gqlTypes);

          this.$nuxt.$loading.finish();
          const duration = Date.now() - startTime;
          this.$toast.info(`Finished in ${duration}ms`, {
            icon: "done"
          });
        })
        .catch(error => {
          this.$nuxt.$loading.finish();
          this.schemaString = error + ". Check console for details.";
          this.$toast.error(error + " (F12 for details)", {
            icon: "error"
          });
          console.log("Error", error);
        });
    }
  }
};
</script>
