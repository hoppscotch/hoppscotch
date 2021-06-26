<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="heading">
          {{ $t("import_export") }} {{ $t("collections") }}
        </h3>
        <div>
          <v-popover>
            <button
              v-tooltip.left="$t('more')"
              class="tooltip-target icon button"
            >
              <i class="material-icons">more_vert</i>
            </button>
            <template slot="popover">
              <div>
                <button
                  v-close-popover
                  class="icon button"
                  @click="readCollectionGist"
                >
                  <i class="material-icons">assignment_returned</i>
                  <span>{{ $t("import_from_gist") }}</span>
                </button>
              </div>
              <div
                v-tooltip.bottom="{
                  content: !currentUser
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : currentUser.provider !== 'github.com'
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : null,
                }"
              >
                <button
                  v-close-popover
                  :disabled="
                    !currentUser
                      ? true
                      : currentUser.provider !== 'github.com'
                      ? true
                      : false
                  "
                  class="icon button"
                  @click="createCollectionGist"
                >
                  <i class="material-icons">assignment_turned_in</i>
                  <span>{{ $t("create_secret_gist") }}</span>
                </button>
              </div>
            </template>
          </v-popover>
          <button class="icon button" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <div class="flex flex-col items-start p-2">
        <button
          v-tooltip="$t('replace_current')"
          class="icon button"
          @click="openDialogChooseFileToReplaceWith"
        >
          <i class="material-icons">folder_special</i>
          <span>{{ $t("replace_json") }}</span>
          <input
            ref="inputChooseFileToReplaceWith"
            class="input"
            type="file"
            style="display: none"
            accept="application/json"
            @change="replaceWithJSON"
          />
        </button>
        <button
          v-tooltip="$t('preserve_current')"
          class="icon button"
          @click="openDialogChooseFileToImportFrom"
        >
          <i class="material-icons">create_new_folder</i>
          <span>{{ $t("import_json") }}</span>
          <input
            ref="inputChooseFileToImportFrom"
            class="input"
            type="file"
            style="display: none"
            accept="application/json"
            @change="importFromJSON"
          />
        </button>
        <button
          v-tooltip="$t('download_file')"
          class="icon button"
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
import { currentUser$ } from "~/helpers/fb/auth"
import {
  graphqlCollections$,
  setGraphqlCollections,
  appendGraphqlCollections,
} from "~/newstore/collections"

export default {
  props: {
    show: Boolean,
  },
  subscriptions() {
    return {
      collections: graphqlCollections$,
      currentUser: currentUser$,
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
    async readCollectionGist() {
      const gist = prompt(this.$t("enter_gist_url"))
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
      let text = this.collectionJson
      text = text.replace(/\n/g, "\r\n")
      const blob = new Blob([text], {
        type: "text/json",
      })
      const anchor = document.createElement("a")
      anchor.download = "hoppscotch-collection.json"
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
    failedImport() {
      this.$toast.error(this.$t("import_failed"), {
        icon: "error",
      })
    },
    parsePostmanCollection({ info, name, item }) {
      const postwomanCollection = {
        name: "",
        folders: [],
        requests: [],
      }

      postwomanCollection.name = info ? info.name : name

      if (item && item.length > 0) {
        for (const collectionItem of item) {
          if (collectionItem.request) {
            if (
              Object.prototype.hasOwnProperty.call(
                postwomanCollection,
                "folders"
              )
            ) {
              postwomanCollection.name = info ? info.name : name
              postwomanCollection.requests.push(
                this.parsePostmanRequest(collectionItem)
              )
            } else {
              postwomanCollection.name = name || ""
              postwomanCollection.requests.push(
                this.parsePostmanRequest(collectionItem)
              )
            }
          } else if (this.hasFolder(collectionItem)) {
            postwomanCollection.folders.push(
              this.parsePostmanCollection(collectionItem)
            )
          } else {
            postwomanCollection.requests.push(
              this.parsePostmanRequest(collectionItem)
            )
          }
        }
      }
      return postwomanCollection
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
}
</script>
