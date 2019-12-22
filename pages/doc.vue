<template>
  <div class="page">
    <pw-section class="blue" label="Import Collection" ref="collections">
      <ul>
        <li>
          <label for="collectionUpload">
            <button
              class="icon"
              @click="$refs.collectionUpload.click()"
              v-tooltip="'JSON'"
            >
              <i class="material-icons">folder</i>
              <span>Import Collection</span>
            </button>
          </label>
          <input
            ref="collectionUpload"
            name="collectionUpload"
            type="file"
            @change="uploadCollection"
          />
        </li>
      </ul>
      <ul>
        <li>
          <label for="rawBody">{{ $t("collections") }}</label>
          <Editor
            v-model="collectionJSON"
            :lang="'json'"
            :options="{
              maxLines: '16',
              minLines: '8',
              fontSize: '16px',
              autoScrollEditorIntoView: true,
              showPrintMargin: false,
              useWorker: false
            }"
          />
        </li>
      </ul>
      <ul>
        <li>
          <button class="icon" @click="getDoc">
            <i class="material-icons">book</i>
            <span>Generate Documentation</span>
          </button>
        </li>
      </ul>
    </pw-section>

    <pw-section class="green" label="Documentation" ref="documentation">
      <div>
        <span v-for="(collection, index) in this.items" :key="index">
          <span>
            <h2>
              Collection #{{ index + 1 }}: {{ collection.name || "None" }}
            </h2>
          </span>
          <span v-for="(folder, index) in collection.folders" :key="index">
            <h3>Folder #{{ index + 1 }}: {{ folder.name || "None" }}</h3>
            <span v-for="(request, index) in folder.requests" :key="index">
              <p>Request #{{ index + 1 }}: {{ request.name || "None" }}</p>
              <p>path: {{ request.path || "None" }}</p>
              <p>method: {{ request.method || "None" }}</p>
              <p>auth: {{ request.auth || "None" }}</p>
              <p>httpUser: {{ request.httpUser || "None" }}</p>
              <p>httpPassword: {{ request.httpPassword || "None" }}</p>
              <p>bearerToken: {{ request.bearerToken || "None" }}</p>
              <h4>Headers</h4>
              <span v-for="header in request.headers" :key="header.key">
                <p>Key: {{ header.key || "None" }}</p>
                <p>Value: {{ header.value || "None" }}</p>
              </span>
              <h4>Parameters</h4>
              <span v-for="parameter in request.params" :key="parameter.key">
                <p>Key: {{ parameter.key || "None" }}</p>
                <p>Value: {{ parameter.value || "None" }}</p>
              </span>
              <h4>Payload</h4>
              <span v-for="payload in request.bodyParam" :key="payload.key">
                <p>Key: {{ payload.key || "None" }}</p>
                <p>Value: {{ payload.value || "None" }}</p>
              </span>
              <p>rawParams: {{ request.rawParams || "None" }}</p>
              <p>contentType: {{ request.contentType || "None" }}</p>
              <p>requestType: {{ request.requestType || "None" }}</p>
            </span>
          </span>
        </span>
      </div>
    </pw-section>
  </div>
</template>

<style scoped lang="scss"></style>

<script>
import AceEditor from "../components/ace-editor";

export default {
  components: {
    "pw-section": () => import("../components/section"),
    Editor: AceEditor
  },

  data() {
    return {
      collectionJSON: "[]",
      items: []
    };
  },

  methods: {
    uploadCollection() {
      this.rawInput = true;
      let file = this.$refs.collectionUpload.files[0];
      if (file !== undefined && file !== null) {
        let reader = new FileReader();
        reader.onload = e => {
          this.collectionJSON = e.target.result;
        };
        reader.readAsText(file);
        this.$toast.info("File imported", {
          icon: "attach_file"
        });
      } else {
        this.$toast.error("Choose a file", {
          icon: "attach_file"
        });
      }
    },

    getDoc() {
      try {
        this.items = JSON.parse(this.collectionJSON);
        this.$toast.info("Documentation generated", {
          icon: "book"
        });
      } catch (e) {
        this.$toast.error(e, {
          icon: "code"
        });
      }
    }
  }
};
</script>
