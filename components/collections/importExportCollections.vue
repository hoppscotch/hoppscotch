<template>
  <modal v-if="show" @close="hideModel">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">
              Import / Export Collections
            </h3>
            <div>
              <button class="icon" @click="hideModel">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div slot="body">
      <textarea v-model="collectionJson" rows="8" />
    </div>
    <div slot="footer">
      <ul>
        <li>
          <button
            v-tooltip="'Replace current'"
            class="icon"
            @click="openDialogChooseFileToReplaceWith"
          >
            <i class="material-icons">create_new_folder</i>
            <span>Replace with JSON</span>
            <input
              ref="inputChooseFileToReplaceWith"
              type="file"
              style="display: none;"
              @change="replaceWithJSON"
            />
          </button>
        </li>
        <li>
          <button
            v-tooltip="'Preserve current'"
            class="icon"
            @click="openDialogChooseFileToImportFrom"
          >
            <i class="material-icons">folder_shared</i>
            <span>Import from JSON</span>
            <input
              ref="inputChooseFileToImportFrom"
              type="file"
              style="display: none;"
              @change="importFromJSON"
            />
          </button>
        </li>
        <li>
          <button v-tooltip="'Download file'" class="icon" @click="exportJSON">
            <i class="material-icons">get_app</i>
            <span>Export to JSON</span>
          </button>
        </li>
      </ul>
    </div>
  </modal>
</template>

<script>
export default {
  components: {
    modal: () => import("../../components/modal")
  },
  props: {
    show: Boolean
  },
  computed: {
    collectionJson() {
      return JSON.stringify(this.$store.state.postwoman.collections, null, 2)
    }
  },
  methods: {
    hideModel() {
      this.$emit("hide-modal")
    },
    openDialogChooseFileToReplaceWith() {
      this.$refs.inputChooseFileToReplaceWith.click()
    },
    openDialogChooseFileToImportFrom() {
      this.$refs.inputChooseFileToImportFrom.click()
    },
    replaceWithJSON() {
      let reader = new FileReader()
      reader.onload = event => {
        let content = event.target.result
        let collections = JSON.parse(content)
        this.$store.commit("postwoman/replaceCollections", collections)
      }
      reader.readAsText(this.$refs.inputChooseFileToReplaceWith.files[0])
    },
    importFromJSON() {
      let reader = new FileReader()
      reader.onload = event => {
        let content = event.target.result
        let collections = JSON.parse(content)
        this.$store.commit("postwoman/importCollections", collections)
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
    },
    exportJSON() {
      let text = this.collectionJson
      text = text.replace(/\n/g, "\r\n")
      let blob = new Blob([text], {
        type: "text/json"
      })
      let anchor = document.createElement("a")
      anchor.download = "postwoman-collection.json"
      anchor.href = window.URL.createObjectURL(blob)
      anchor.target = "_blank"
      anchor.style.display = "none"
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    }
  }
}
</script>
