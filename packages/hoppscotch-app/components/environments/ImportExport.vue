<template>
  <SmartModal
    v-if="show"
    :title="`${$t('modal.import_export')} ${$t('environment.title')}`"
    max-width="sm:max-w-md"
    @close="hideModal"
  >
    <template #actions>
      <span>
        <tippy ref="options" interactive trigger="click" theme="popover" arrow>
          <template #trigger>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('action.more')"
              class="rounded"
              svg="more-vertical"
            />
          </template>
          <SmartItem
            icon="assignment_returned"
            :label="$t('import.from_gist')"
            @click.native="
              readEnvironmentGist
              $refs.options.tippy().hide()
            "
          />
          <span
            v-tippy="{ theme: 'tooltip' }"
            :title="
              !currentUser
                ? $t('export.require_github')
                : currentUser.provider !== 'github.com'
                ? $t('export.require_github')
                : null
            "
          >
            <SmartItem
              :disabled="
                !currentUser
                  ? true
                  : currentUser.provider !== 'github.com'
                  ? true
                  : false
              "
              icon="assignment_turned_in"
              :label="$t('export.create_secret_gist')"
              @click.native="
                createEnvironmentGist
                $refs.options.tippy().hide()
              "
            />
          </span>
        </tippy>
      </span>
    </template>
    <template #body>
      <div class="flex flex-col space-y-2">
        <SmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.replace_current')"
          svg="file"
          :label="$t('action.replace_json')"
          @click.native="openDialogChooseFileToReplaceWith"
        />
        <input
          ref="inputChooseFileToReplaceWith"
          class="input"
          type="file"
          accept="application/json"
          @change="replaceWithJSON"
        />
        <SmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.preserve_current')"
          svg="folder-plus"
          :label="$t('import.json')"
          @click.native="openDialogChooseFileToImportFrom"
        />
        <input
          ref="inputChooseFileToImportFrom"
          class="input"
          type="file"
          accept="application/json"
          @change="importFromJSON"
        />
        <SmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.download_file')"
          svg="download"
          :label="$t('export.as_json')"
          @click.native="exportJSON"
        />
      </div>
    </template>
  </SmartModal>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { currentUser$ } from "~/helpers/fb/auth"
import { useReadonlyStream } from "~/helpers/utils/composables"
import {
  environments$,
  replaceEnvironments,
  appendEnvironments,
} from "~/newstore/environments"

export default defineComponent({
  props: {
    show: Boolean,
  },
  setup() {
    return {
      environments: useReadonlyStream(environments$, []),
      currentUser: useReadonlyStream(currentUser$, null),
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
              Authorization: `token ${this.currentUser.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )
        .then((res) => {
          this.$toast.success(this.$t("export.gist_created"))
          window.open(res.html_url)
        })
        .catch((e) => {
          this.$toast.error(this.$t("error.something_went_wrong"))
          console.error(e)
        })
    },
    async readEnvironmentGist() {
      const gist = prompt(this.$t("import.gist_url"))
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
        .catch((e) => {
          this.failedImport()
          console.error(e)
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
          this.importFromHoppscotch(importFileObj)
        }
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
      this.$refs.inputChooseFileToImportFrom.value = ""
    },
    importFromHoppscotch(environments) {
      appendEnvironments(environments)
      this.fileImported()
    },
    importFromPostman({ name, values }) {
      const environment = { name, variables: [] }
      values.forEach(({ key, value }) =>
        environment.variables.push({ key, value })
      )
      const environments = [environment]
      this.importFromHoppscotch(environments)
    },
    exportJSON() {
      const dataToWrite = this.environmentJson
      const file = new Blob([dataToWrite], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url
      // TODO get uri from meta
      a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}.json`
      document.body.appendChild(a)
      a.click()
      this.$toast.success(this.$t("state.download_started"))
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 1000)
    },
    fileImported() {
      this.$toast.success(this.$t("state.file_imported"))
    },
  },
})
</script>
