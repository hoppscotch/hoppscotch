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
      <ul>
        {{
          this.items
        }}
      </ul>
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
      let json = this.collectionJSON;
      let html;
      this.items = html;
    }
  }
};
</script>
