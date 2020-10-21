<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="row-wrapper">
            <h3 class="title">{{ $t("import_export") }} {{ $t("environments") }}</h3>
            <div>
              <button class="icon" @click="hideModal">
                <closeIcon class="material-icons" />
              </button>
            </div>
          </div>
          <div class="row-wrapper">
            <span
              v-tooltip="{
                content: !fb.currentUser ? $t('login_first') : $t('replace_current'),
              }"
            >
              <button :disabled="!fb.currentUser" class="icon" @click="syncEnvironments">
                <i class="material-icons">folder_shared</i>
                <span>{{ $t("import_from_sync") }}</span>
              </button>
            </span>
            <button
              class="icon"
              @click="openDialogChooseFileToReplaceWith"
              v-tooltip="$t('replace_current')"
            >
              <i class="material-icons">create_new_folder</i>
              <span>{{ $t("replace_json") }}</span>
              <input
                type="file"
                @change="replaceWithJSON"
                style="display: none"
                ref="inputChooseFileToReplaceWith"
                accept="application/json"
              />
            </button>
            <button
              class="icon"
              @click="openDialogChooseFileToImportFrom"
              v-tooltip="$t('preserve_current')"
            >
              <i class="material-icons">folder_special</i>
              <span>{{ $t("import_json") }}</span>
              <input
                type="file"
                @change="importFromJSON"
                style="display: none"
                ref="inputChooseFileToImportFrom"
                accept="application/json"
              />
            </button>
          </div>
        </li>
      </ul>
    </div>
    <div slot="body">
      <textarea v-model="environmentJson" rows="8"></textarea>
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="exportJSON" v-tooltip="$t('download_file')">
            {{ $t("export") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
import { fb } from "~/helpers/fb"
import closeIcon from "~/static/icons/close-24px.svg?inline"

export default {
  components: {
    closeIcon,
  },
  data() {
    return {
      fb,
    }
  },
  props: {
    show: Boolean,
  },
  computed: {
    environmentJson() {
      return JSON.stringify(this.$store.state.postwoman.environments, null, 2)
    },
  },
  methods: {
    hideModal() {
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
      reader.onload = ({ target }) => {
        let content = target.result
        let environments = JSON.parse(content)
        this.$store.commit("postwoman/replaceEnvironments", environments)
      }
      reader.readAsText(this.$refs.inputChooseFileToReplaceWith.files[0])
      this.fileImported()
      this.syncToFBEnvironments()
      this.$refs.inputChooseFileToReplaceWith.value = ""
    },
    importFromJSON() {
      let reader = new FileReader()
      reader.onload = ({ target }) => {
        let content = target.result
        let importFileObj = JSON.parse(content)
        if (
          importFileObj["_postman_variable_scope"] === "environment" ||
          importFileObj["_postman_variable_scope"] === "globals"
        ) {
          this.importFromPostman(importFileObj)
        } else {
          this.importFromPostwoman(importFileObj)
        }
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
      this.syncToFBEnvironments()
      this.$refs.inputChooseFileToImportFrom.value = ""
    },
    importFromPostwoman(environments) {
      let confirmation = this.$t("file_imported")
      this.$store.commit("postwoman/importAddEnvironments", {
        environments,
        confirmation,
      })
    },
    importFromPostman({ name, values }) {
      let environment = { name: name, variables: [] }
      values.forEach(({ key, value }) => environment.variables.push({ key: key, value: value }))
      let environments = [environment]
      this.importFromPostwoman(environments)
    },
    exportJSON() {
      let text = this.environmentJson
      text = text.replace(/\n/g, "\r\n")
      let blob = new Blob([text], {
        type: "text/json",
      })
      let anchor = document.createElement("a")
      anchor.download = "hoppscotch-environment.json"
      anchor.href = window.URL.createObjectURL(blob)
      anchor.target = "_blank"
      anchor.style.display = "none"
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      this.$toast.success(this.$t("download_started"), {
        icon: "done",
      })
    },
    syncEnvironments() {
      this.$store.commit("postwoman/replaceEnvironments", fb.currentEnvironments)
      this.fileImported()
    },
    syncToFBEnvironments() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[1].value) {
          fb.writeEnvironments(JSON.parse(JSON.stringify(this.$store.state.postwoman.environments)))
        }
      }
    },
    fileImported() {
      this.$toast.info(this.$t("file_imported"), {
        icon: "folder_shared",
      })
    },
  },
}
</script>
