<template>
  <SmartModal
    v-if="show"
    :title="`${$t('modal.import_export')} ${$t('collections')}`"
    @close="hideModal"
  >
    <template #actions>
      <span>
        <tippy ref="options" interactive trigger="click" theme="popover" arrow>
          <template #trigger>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('more')"
              icon="more_vert"
            />
          </template>
          <SmartItem
            icon="assignment_returned"
            :label="$t('import.from_gist')"
            @click.native="
              readCollectionGist
              $refs.options.tippy().hide()
            "
          />
          <SmartItem
            v-tippy="{ theme: 'tooltip' }"
            :title="
              !currentUser
                ? $t('export.require_github')
                : currentUser.provider !== 'github.com'
                ? $t('export.require_github')
                : null
            "
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
              createCollectionGist
              $refs.options.tippy().hide()
            "
          />
        </tippy>
      </span>
    </template>
    <template #body>
      <div class="flex flex-col space-y-2">
        <SmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('replace_current')"
          icon="folder_special"
          :label="$t('replace_json')"
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
          :title="$t('preserve_current')"
          icon="create_new_folder"
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
          :title="$t('download_file')"
          icon="drive_file_move"
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
  graphqlCollections$,
  setGraphqlCollections,
  appendGraphqlCollections,
} from "~/newstore/collections"

export default defineComponent({
  props: {
    show: Boolean,
  },
  setup() {
    return {
      collections: useReadonlyStream(graphqlCollections$, []),
      currentUser: useReadonlyStream(currentUser$, null),
    }
  },
  computed: {
    collectionJson() {
      return JSON.stringify(this.collections, null, 2)
    },
  },
  methods: {
    async createCollectionGist() {
      await this.$axios
        .$post(
          "https://api.github.com/gists",
          {
            files: {
              "hoppscotch-collections.json": {
                content: this.collectionJson,
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
          this.$toast.success(this.$t("export.gist_created"), {
            icon: "done",
          })
          window.open(res.html_url)
        })
        .catch((e) => {
          this.$toast.error(this.$t("error.something_went_wrong"), {
            icon: "error",
          })
          console.error(e)
        })
    },
    async readCollectionGist() {
      const gist = prompt(this.$t("import.gist_url"))
      if (!gist) return
      await this.$axios
        .$get(`https://api.github.com/gists/${gist.split("/").pop()}`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        })
        .then(({ files }) => {
          const collections = JSON.parse(Object.values(files)[0].content)
          setGraphqlCollections(collections)
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
        let collections = JSON.parse(content)
        if (collections[0]) {
          const [name, folders, requests] = Object.keys(collections[0])
          if (
            name === "name" &&
            folders === "folders" &&
            requests === "requests"
          ) {
            // Do nothing
          }
        } else if (
          collections.info &&
          collections.info.schema.includes("v2.1.0")
        ) {
          collections = [this.parsePostmanCollection(collections)]
        } else {
          this.failedImport()
          return
        }
        setGraphqlCollections(collections)
        this.fileImported()
      }
      reader.readAsText(this.$refs.inputChooseFileToReplaceWith.files[0])
      this.$refs.inputChooseFileToReplaceWith.value = ""
    },
    importFromJSON() {
      const reader = new FileReader()
      reader.onload = ({ target }) => {
        const content = target.result
        let collections = JSON.parse(content)
        if (collections[0]) {
          const [name, folders, requests] = Object.keys(collections[0])
          if (
            name === "name" &&
            folders === "folders" &&
            requests === "requests"
          ) {
            // Do nothing
          }
        } else if (
          collections.info &&
          collections.info.schema.includes("v2.1.0")
        ) {
          // replace the variables, postman uses {{var}}, Hoppscotch uses <<var>>
          collections = JSON.parse(
            content.replaceAll(/{{([a-z]+)}}/gi, "<<$1>>")
          )
          collections = [this.parsePostmanCollection(collections)]
        } else {
          this.failedImport()
          return
        }
        appendGraphqlCollections(collections)
        this.fileImported()
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
      this.$refs.inputChooseFileToImportFrom.value = ""
    },
    exportJSON() {
      const dataToWrite = this.collectionJson
      const file = new Blob([dataToWrite], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url
      // TODO get uri from meta
      a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
      document.body.appendChild(a)
      a.click()
      this.$toast.success(this.$t("download_started"), {
        icon: "done",
      })
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 1000)
    },
    fileImported() {
      this.$toast.info(this.$t("file_imported"), {
        icon: "folder_shared",
      })
    },
    failedImport() {
      this.$toast.error(this.$t("import.failed"), {
        icon: "error",
      })
    },
    parsePostmanCollection({ info, name, item }) {
      const hoppscotchCollection = {
        name: "",
        folders: [],
        requests: [],
      }

      hoppscotchCollection.name = info ? info.name : name

      if (item && item.length > 0) {
        for (const collectionItem of item) {
          if (collectionItem.request) {
            if (
              Object.prototype.hasOwnProperty.call(
                hoppscotchCollection,
                "folders"
              )
            ) {
              hoppscotchCollection.name = info ? info.name : name
              hoppscotchCollection.requests.push(
                this.parsePostmanRequest(collectionItem)
              )
            } else {
              hoppscotchCollection.name = name || ""
              hoppscotchCollection.requests.push(
                this.parsePostmanRequest(collectionItem)
              )
            }
          } else if (this.hasFolder(collectionItem)) {
            hoppscotchCollection.folders.push(
              this.parsePostmanCollection(collectionItem)
            )
          } else {
            hoppscotchCollection.requests.push(
              this.parsePostmanRequest(collectionItem)
            )
          }
        }
      }
      return hoppscotchCollection
    },
    parsePostmanRequest({ name, request }) {
      const pwRequest = {
        url: "",
        path: "",
        method: "",
        auth: "",
        httpUser: "",
        httpPassword: "",
        passwordFieldType: "password",
        bearerToken: "",
        headers: [],
        params: [],
        bodyParams: [],
        rawParams: "",
        rawInput: false,
        contentType: "",
        requestType: "",
        name: "",
      }

      pwRequest.name = name
      const requestObjectUrl = request.url.raw.match(
        /^(.+:\/\/[^/]+|{[^/]+})(\/[^?]+|).*$/
      )
      if (requestObjectUrl) {
        pwRequest.url = requestObjectUrl[1]
        pwRequest.path = requestObjectUrl[2] ? requestObjectUrl[2] : ""
      }
      pwRequest.method = request.method
      const itemAuth = request.auth ? request.auth : ""
      const authType = itemAuth ? itemAuth.type : ""
      if (authType === "basic") {
        pwRequest.auth = "Basic Auth"
        pwRequest.httpUser =
          itemAuth.basic[0].key === "username"
            ? itemAuth.basic[0].value
            : itemAuth.basic[1].value
        pwRequest.httpPassword =
          itemAuth.basic[0].key === "password"
            ? itemAuth.basic[0].value
            : itemAuth.basic[1].value
      } else if (authType === "oauth2") {
        pwRequest.auth = "OAuth 2.0"
        pwRequest.bearerToken =
          itemAuth.oauth2[0].key === "accessToken"
            ? itemAuth.oauth2[0].value
            : itemAuth.oauth2[1].value
      } else if (authType === "bearer") {
        pwRequest.auth = "Bearer Token"
        pwRequest.bearerToken = itemAuth.bearer[0].value
      }
      const requestObjectHeaders = request.header
      if (requestObjectHeaders) {
        pwRequest.headers = requestObjectHeaders
        for (const header of pwRequest.headers) {
          delete header.name
          delete header.type
        }
      }
      const requestObjectParams = request.url.query
      if (requestObjectParams) {
        pwRequest.params = requestObjectParams
        for (const param of pwRequest.params) {
          delete param.disabled
        }
      }
      if (request.body) {
        if (request.body.mode === "urlencoded") {
          const params = request.body.urlencoded
          pwRequest.bodyParams = params || []
          for (const param of pwRequest.bodyParams) {
            delete param.type
          }
        } else if (request.body.mode === "raw") {
          pwRequest.rawInput = true
          pwRequest.rawParams = request.body.raw
        }
      }
      return pwRequest
    },
    hasFolder(item) {
      return Object.prototype.hasOwnProperty.call(item, "item")
    },
  },
})
</script>
