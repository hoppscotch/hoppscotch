<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="row-wrapper">
            <h3 class="title">{{ $t("import_export") }} {{ $t("teams") }}</h3>
            <div>
              <button class="icon" @click="hideModal">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
          <div class="row-wrapper">
            <span
              v-tooltip="{
                content: !fb.currentUser ? $t('login_first') : $t('replace_current'),
              }"
            >
              <button :disabled="!fb.currentUser" class="icon" @click="syncTeams">
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
      <textarea v-model="teamJson" rows="8" readonly></textarea>
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
  </SmartModal>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      fb,
    }
  },
  props: {
    show: Boolean,
    teams: Array,
  },
  computed: {
    teamJson() {
      return this.teams
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
      reader.onload = (event) => {
        let content = event.target.result
        let teams = JSON.parse(content)
      }
      reader.readAsText(this.$refs.inputChooseFileToReplaceWith.files[0])
      this.fileImported()
      this.syncToFBTeams()
    },
    importFromJSON() {
      let reader = new FileReader()
      reader.onload = (event) => {
        let content = event.target.result
        let importFileObj = JSON.parse(content)
        if (importFileObj["_postman_member_scope"] === "team") {
          this.importFromPostman(importFileObj)
        } else {
          this.importFromPostwoman(importFileObj)
        }
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
      this.syncToFBTeams()
    },
    importFromPostwoman(teams) {
      let confirmation = this.$t("file_imported")
      console.log("Import from PW")
    },
    importFromPostman(importFileObj) {
      let team = { name: importFileObj.name, members: [] }
      importFileObj.values.forEach((element) =>
        team.members.push({ key: element.key, value: element.value })
      )
      let teams = [team]
      this.importFromPostwoman(teams)
    },
    exportJSON() {
      let text = this.teamJson
      text = text.replace(/\n/g, "\r\n")
      let blob = new Blob([text], {
        type: "text/json",
      })
      let anchor = document.createElement("a")
      anchor.download = "postwoman-team.json"
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
    syncTeams() {
      this.fileImported()
    },
    syncToFBTeams() {
      console.log("syncToFBTeams")
    },
    fileImported() {
      this.$toast.info(this.$t("file_imported"), {
        icon: "folder_shared",
      })
    },
  },
}
</script>
