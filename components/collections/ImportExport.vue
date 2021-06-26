<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="heading">
          {{ $t("import_export") }} {{ $t("collections") }}
        </h3>
        <div>
          <button
            v-if="mode != 'import_export'"
            v-tooltip.left="'Back'"
            class="tooltip-target icon button"
            @click="mode = 'import_export'"
          >
            <i class="material-icons">arrow_back</i>
          </button>
          <v-popover
            v-if="
              mode == 'import_export' &&
              collectionsType.type == 'my-collections'
            "
          >
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
      <div v-if="mode == 'import_export'" class="flex flex-col p-2 items-start">
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
          v-if="collectionsType.type == 'team-collections'"
          v-tooltip="$t('preserve_current')"
          class="icon button"
          @click="mode = 'import_from_my_collections'"
        >
          <i class="material-icons">folder_shared</i>
          <span>{{ $t("import_from_my_collections") }}</span>
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
      <div v-if="mode == 'import_from_my_collections'">
        <span class="select-wrapper">
          <select
            type="text"
            class="select"
            autofocus
            @change="
              ($event) => {
                mySelectedCollectionID = $event.target.value
              }
            "
          >
            <option
              :key="undefined"
              :value="undefined"
              hidden
              disabled
              selected
            >
              Select Collection
            </option>
            <option
              v-for="(collection, index) in myCollections"
              :key="index"
              :value="index"
            >
              {{ collection.name }}
            </option>
          </select>
        </span>
        <div slot="footer">
          <div class="row-wrapper">
            <span></span>
            <span>
              <button
                class="m-2 icon button primary"
                :disabled="mySelectedCollectionID == undefined"
                @click="importFromMyCollections"
              >
                {{ $t("import") }}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import { currentUser$ } from "~/helpers/fb/auth"
import * as teamUtils from "~/helpers/teams/utils"
import {
  restCollections$,
  setRESTCollections,
  appendRESTCollections,
} from "~/newstore/collections"

export default {
  props: {
    show: Boolean,
    collectionsType: { type: Object, default: () => {} },
  },
  data() {
    return {
      showJsonCode: false,
      mode: "import_export",
      mySelectedCollectionID: undefined,
      collectionJson: "",
    }
  },
  subscriptions() {
    return {
      myCollections: restCollections$,
      currentUser: currentUser$,
    }
  },
  methods: {
    async createCollectionGist() {
      this.getJSONCollection()
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
          setRESTCollections(collections)
          this.fileImported()
        })
        .catch((error) => {
          this.failedImport()
          console.log(error)
        })
    },
    hideModal() {
      this.mode = "import_export"
      this.mySelectedCollectionID = undefined
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
        }
        if (this.collectionsType.type === "team-collections") {
          teamUtils
            .replaceWithJSON(
              this.$apollo,
              collections,
              this.collectionsType.selectedTeam.id
            )
            .then((status) => {
              if (status) {
                this.fileImported()
              } else {
                this.failedImport()
              }
            })
            .catch((error) => {
              console.log(error)
              this.failedImport()
            })
        } else {
          setRESTCollections(collections)
          this.fileImported()
        }
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
        if (this.collectionsType.type === "team-collections") {
          teamUtils
            .importFromJSON(
              this.$apollo,
              collections,
              this.collectionsType.selectedTeam.id
            )
            .then((status) => {
              if (status) {
                this.$emit("update-team-collections")
                this.fileImported()
              } else {
                this.failedImport()
              }
            })
            .catch((error) => {
              console.log(error)
              this.failedImport()
            })
        } else {
          appendRESTCollections(collections)
          this.fileImported()
        }
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
      this.$refs.inputChooseFileToImportFrom.value = ""
    },
    importFromMyCollections() {
      teamUtils
        .importFromMyCollections(
          this.$apollo,
          this.mySelectedCollectionID,
          this.collectionsType.selectedTeam.id
        )
        .then((success) => {
          if (success) {
            this.fileImported()
            this.$emit("update-team-collections")
          } else {
            this.failedImport()
          }
        })
        .catch((error) => {
          console.log(error)
          this.failedImport()
        })
    },
    async getJSONCollection() {
      if (this.collectionsType.type === "my-collections") {
        this.collectionJson = JSON.stringify(this.myCollections, null, 2)
      } else {
        this.collectionJson = await teamUtils.exportAsJSON(
          this.$apollo,
          this.collectionsType.selectedTeam.id
        )
      }
      return this.collectionJson
    },
    exportJSON() {
      this.getJSONCollection()
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
      if (request.url) {
        const requestObjectUrl = request.url.raw.match(
          /^(.+:\/\/[^/]+|{[^/]+})(\/[^?]+|).*$/
        )
        if (requestObjectUrl) {
          pwRequest.url = requestObjectUrl[1]
          pwRequest.path = requestObjectUrl[2] ? requestObjectUrl[2] : ""
        }
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
      if (request.url) {
        const requestObjectParams = request.url.query
        if (requestObjectParams) {
          pwRequest.params = requestObjectParams
          for (const param of pwRequest.params) {
            delete param.disabled
          }
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
