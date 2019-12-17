<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">Import / Export Collections</h3>
            <div>
              <button class="icon" @click="hideModal">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div slot="body">
      <textarea v-model="collectionJson" rows="8"></textarea>
    </div>
    <div slot="footer">
      <div class="flex-wrap">
        <span>
          <button
            class="icon"
            @click="openDialogChooseFileToReplaceWith"
            v-tooltip="'Replace current'"
          >
            <i class="material-icons">create_new_folder</i>
            <span>Replace with JSON</span>
            <input
              type="file"
              @change="replaceWithJSON"
              style="display: none;"
              ref="inputChooseFileToReplaceWith"
            />
          </button>
          <button
            class="icon"
            @click="openDialogChooseFileToImportFrom"
            v-tooltip="'Preserve current'"
          >
            <i class="material-icons">folder_shared</i>
            <span>Import from JSON</span>
            <input
              type="file"
              @change="importFromJSON"
              style="display: none;"
              ref="inputChooseFileToImportFrom"
            />
          </button>
        </span>
        <span></span>
      </div>
      <div class="flex-wrap">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            Cancel
          </button>
          <button
            class="icon primary"
            @click="exportJSON"
            v-tooltip="'Download file'"
          >
            Export
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
export default {
  props: {
    show: Boolean
  },
  components: {
    modal: () => import("../../components/modal")
  },
  computed: {
    collectionJson() {
      return JSON.stringify(this.$store.state.postwoman.collections, null, 2);
    }
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal");
    },
    openDialogChooseFileToReplaceWith() {
      this.$refs.inputChooseFileToReplaceWith.click();
    },
    openDialogChooseFileToImportFrom() {
      this.$refs.inputChooseFileToImportFrom.click();
    },
    replaceWithJSON() {
      let reader = new FileReader();
      reader.onload = event => {
        let content = event.target.result;
        let collections = JSON.parse(content);
        this.$store.commit("postwoman/replaceCollections", collections);
      };
      reader.readAsText(this.$refs.inputChooseFileToReplaceWith.files[0]);
    },
    importFromJSON() {
      let reader = new FileReader();
      reader.onload = event => {
        let content = event.target.result;
        let collections = JSON.parse(content);
        this.$store.commit("postwoman/importCollections", collections);
      };
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0]);
    },
    exportJSON() {
      let text = this.collectionJson;
      text = text.replace(/\n/g, "\r\n");
      let blob = new Blob([text], {
        type: "text/json"
      });
      let anchor = document.createElement("a");
      anchor.download = "postwoman-collection.json";
      anchor.href = window.URL.createObjectURL(blob);
      anchor.target = "_blank";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  }
};
</script>
