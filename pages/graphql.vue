<template>
  <div class="page">
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
          <button
            id="get"
            name="get"
            @click="getSchema"
          >
            Get Schema
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

<style>
</style>

<script>
import axios from 'axios';
import * as gql from 'graphql';
import AceEditor from '../components/ace-editor';

export default {
  components: {
    'pw-section': () => import('../components/section'),
    Editor: AceEditor
  },
  data() {
    return {
      url: "https://rickandmortyapi.com/graphql",
      schemaString: ''
    }
  },
  methods: {
    getSchema() {
      axios.post(this.url, {
        query: gql.getIntrospectionQuery()
      }).then((res) => {
        const schema = gql.buildClientSchema(res.data.data);
        this.schemaString = gql.printSchema(schema, { commentDescriptions: true });
      });
    }
  }
}
</script>
