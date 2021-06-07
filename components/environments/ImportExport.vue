<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">
          {{ $t("import_export") }} {{ $t("environments") }}
        </h3>
        <div>
          <v-popover>
            <button v-tooltip.left="$t('more')" class="tooltip-target icon">
              <i class="material-icons">more_vert</i>
            </button>
            <template slot="popover">
              <div>
                <button
                  v-close-popover
                  class="icon"
                  @click="readEnvironmentGist"
                >
                  <i class="material-icons">assignment_returned</i>
                  <span>{{ $t("import_from_gist") }}</span>
                </button>
              </div>
              <div
                v-tooltip.bottom="{
                  content: !fb.currentUser
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : fb.currentUser.provider !== 'github.com'
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : null,
                }"
              >
                <button
                  v-close-popover
                  :disabled="
                    !fb.currentUser
                      ? true
                      : fb.currentUser.provider !== 'github.com'
                      ? true
                      : false
                  "
                  class="icon"
                  @click="createEnvironmentGist"
                >
                  <i class="material-icons">assignment_turned_in</i>
                  <span>{{ $t("create_secret_gist") }}</span>
                </button>
              </div>
            </template>
          </v-popover>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <div class="flex flex-col items-start p-2">
        <button
          v-tooltip="$t('replace_current')"
          class="icon"
          @click="openDialogChooseFileToReplaceWith"
        >
          <i class="material-icons">folder_special</i>
          <span>{{ $t("replace_json") }}</span>
          <input
            ref="inputChooseFileToReplaceWith"
            type="file"
            style="display: none"
            accept="application/json"
            @change="replaceWithJSON"
          />
        </button>
        <button
          v-tooltip="$t('preserve_current')"
          class="icon"
          @click="openDialogChooseFileToImportFrom"
        >
          <i class="material-icons">create_new_folder</i>
          <span>{{ $t("import_json") }}</span>
          <input
            ref="inputChooseFileToImportFrom"
            type="file"
            style="display: none"
            accept="application/json"
            @change="importFromJSON"
          />
        </button>
        <button
          v-tooltip="$t('download_file')"
          class="icon"
          @click="exportJSON"
        >
          <i class="material-icons">drive_file_move</i>
          <span>
            {{ $t("export_as_json") }}
          </span>
        </button>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import { fb } from "~/helpers/fb"
import {
  environments$,
  replaceEnvironments,
  appendEnvironments,
} from "~/newstore/environments"

export default {
  props: {
    show: Boolean,
  },
  data() {
    return {
      fb,
    }
  },
  subscriptions() {
    return {
      environments: environments$,
    }
  },
  computed: {
    environmentJson() {
      return JSON.stringify(this.environments, null, 2)
    },
  },
  methods: {
    async createEnvironmentGist() {
      await this.$axios
        .$post(
          "https://api.github.com/gists",
          {
            files: {
              "hoppscotch-environments.json": {
                content: this.environmentJson,
              },
            },
          },
          {
            headers: {
              Authorization: `token ${fb.currentUser.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )
        .then((res) => {
          this.$toast.success(this.$t("gist_created"), {
            icon: "done",
          })
          window.open(res.html_url)
        })
        .catch((error) => {
          this.$toast.error(this.$t("something_went_wrong"), {
            icon: "error",
          })
          console.log(error)
        })
    },
    async readEnvironmentGist() {
      const gist = prompt(this.$t("enter_gist_url"))
      if (!gist) return
      await this.$axios
        .$get(`https://api.github.com/gists/${gist.split("/").pop()}`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        })
        .then(({ files }) => {
          const environments = JSON.parse(Object.values(files)[0].content)
          replaceEnvironments(environments)
          this.fileImported()
        })
        .catch((error) => {
          this.failedImport()
          console.log(error)
        })
    },
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
      const reader = new FileReader()
      reader.onload = ({ target }) => {
        const content = target.result
        const environments = JSON.parse(content)
        replaceEnvironments(environments)
      }
      reader.readAsText(this.$refs.inputChooseFileToReplaceWith.files[0])
      this.fileImported()
      this.$refs.inputChooseFileToReplaceWith.value = ""
    },
    importFromJSON() {
      const reader = new FileReader()
      reader.onload = ({ target }) => {
        const content = target.result
        const importFileObj = JSON.parse(content)
        if (
          importFileObj._postman_variable_scope === "environment" ||
          importFileObj._postman_variable_scope === "globals"
        ) {
          this.importFromPostman(importFileObj)
        } else {
          this.importFromPostwoman(importFileObj)
        }
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
      this.$refs.inputChooseFileToImportFrom.value = ""
    },
    importFromPostwoman(environments) {
      appendEnvironments(environments)
      this.fileImported()
    },
    importFromPostman({ name, values }) {
      const environment = { name, variables: [] }
      values.forEach(({ key, value }) =>
        environment.variables.push({ key, value })
      )
      const environments = [environment]
      this.importFromPostwoman(environments)
    },
    exportJSON() {
      let text = this.environmentJson
      text = text.replace(/\n/g, "\r\n")
      const blob = new Blob([text], {
        type: "text/json",
      })
      const anchor = document.createElement("a")
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
    fileImported() {
      this.$toast.info(this.$t("file_imported"), {
        icon: "folder_shared",
      })
    },
  },
}
</script>
