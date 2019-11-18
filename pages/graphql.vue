<template>
  <div class="page">
    <pw-section class="blue" label="Endpoint" ref="endpoint">
      <ul>
        <li>
          <label for="url">URL</label>
          <input id="url" type="url" v-model="url" @keyup.enter="getSchema()" />
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
</template>

<style></style>

<script>
import axios from "axios";
import * as gql from "graphql";
import AceEditor from "../components/ace-editor";

export default {
  components: {
    "pw-section": () => import("../components/section"),
    Editor: AceEditor
  },
  data() {
    return {
      url: "https://rickandmortyapi.com/graphql",
      schemaString: ""
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
          console.log('Error', error);
        });
    }
  }
};
</script>
