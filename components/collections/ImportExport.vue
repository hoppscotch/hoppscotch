<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">Export</h3>
        <div>
          <button
            class="tooltip-target icon"
            v-if="mode != 'import_export'"
            @click="mode = 'import_export'"
            v-tooltip.left="'Back'"
          >
            <i class="material-icons">arrow_left</i>
          </button>
          <v-popover v-if="mode == 'import_export' && collectionsType.type == 'my-collections'">
            <button class="tooltip-target icon" v-tooltip.left="$t('more')">
              <i class="material-icons">more_vert</i>
            </button>
            <template slot="popover">
              <div>
                <button class="icon" @click="readCollectionGist" v-close-popover>
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
                  :disabled="
                    !fb.currentUser ? true : fb.currentUser.provider !== 'github.com' ? true : false
                  "
                  class="icon"
                  @click="createCollectionGist"
                  v-close-popover
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
      <div v-if="mode == 'import_export'" class="flex flex-col items-start p-2">
        <span
          v-tooltip="{
            content: !fb.currentUser ? $t('login_first') : $t('replace_current'),
          }"
        >
          <button
            :disabled="!fb.currentUser"
            v-if="collectionsType.type == 'my-collections'"
            class="icon"
            @click="syncCollections"
          >
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
        <button
          class="icon"
          @click="mode = 'import_from_my_collections'"
          v-tooltip="$t('replace_current')"
          v-if="collectionsType.type == 'team-collections'"
        >
          <i class="material-icons">folder_special</i>
          <span>{{ "Import from My Collections" }}</span>
        </button>
        <button
          class="icon"
          @click="
            () => {
              mode = 'export_as_json'
              getJSONCollection()
            }
          "
          v-tooltip="$t('show_code')"
        >
          <i class="material-icons">folder_special</i>
          <span>{{ "Export As JSON" }}</span>
        </button>
      </div>
      <div v-if="mode == 'import_from_my_collections'">
        <span class="select-wrapper">
          <select
            type="text"
            autofocus
            @change="
              ($event) => {
                mySelectedCollectionID = $event.target.value
              }
            "
          >
            <option :key="undefined" :value="undefined" hidden disabled selected>
              Select Collection
            </option>
            <option v-for="(collection, index) in myCollections" :key="index" :value="index">
              {{ collection.name }}
            </option>
          </select>
        </span>
        <button
          class="icon primary"
          :disabled="mySelectedCollectionID == undefined"
          @click="importFromMyCollections"
        >
          {{ $t("import") }}
        </button>
      </div>
      <div v-if="mode == 'export_as_json'">
        <textarea v-model="collectionJson" rows="8" readonly></textarea>
        <div class="row-wrapper">
          <span class="m-2">
            <button class="icon primary" @click="exportJSON" v-tooltip="$t('download_file')">
              {{ $t("export") }}
            </button>
          </span>
        </div>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import { fb } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"
import * as team_utils from "~/helpers/teams/utils"

export default {
  data() {
    return {
      fb,
      showJsonCode: false,
      mode: "import_export",
      mySelectedCollectionID: undefined,
      collectionJson: "",
    }
  },
  subscriptions() {
    return {
      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
    }
  },
  props: {
    show: Boolean,
    collectionsType: Object,
  },
  computed: {
    myCollections() {
      return fb.currentUser !== null
        ? fb.currentCollections
        : this.$store.state.postwoman.collections
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
                content: this.getJSONCollection(),
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
        .then(({ html_url }) => {
          this.$toast.success(this.$t("gist_created"), {
            icon: "done",
          })
          window.open(html_url)
        })
        .catch((error) => {
          this.$toast.error(this.$t("something_went_wrong"), {
            icon: "error",
          })
          console.log(error)
        })
    },
    async readCollectionGist() {
      let gist = prompt(this.$t("enter_gist_url"))
      if (!gist) return
      await this.$axios
        .$get(`https://api.github.com/gists/${gist.split("/").pop()}`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        })
        .then(({ files }) => {
          let collections = JSON.parse(Object.values(files)[0].content)
          this.$store.commit("postwoman/replaceCollections", { data: collections, flag: "rest" })
          this.fileImported()
          this.syncToFBCollections()
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
      let reader = new FileReader()
      reader.onload = ({ target }) => {
        let content = target.result
        let collections = JSON.parse(content)
        if (collections[0]) {
          let [name, folders, requests] = Object.keys(collections[0])
          if (name === "name" && folders === "folders" && requests === "requests") {
            // Do nothing
          }
        } else if (collections.info && collections.info.schema.includes("v2.1.0")) {
          collections = [this.parsePostmanCollection(collections)]
        } else {
          this.failedImport()
        }
        if (this.collectionsType.type == "team-collections") {
          team_utils
            .replaceWithJSON(this.$apollo, collections, this.collectionsType.selectedTeam.id)
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
          this.$store.commit("postwoman/replaceCollections", {
            data: collections,
            flag: "rest",
          })
          this.fileImported()
          this.syncToFBCollections()
        }
      }
      reader.readAsText(this.$refs.inputChooseFileToReplaceWith.files[0])
      this.$refs.inputChooseFileToReplaceWith.value = ""
    },
    importFromJSON() {
      let reader = new FileReader()
      reader.onload = ({ target }) => {
        let content = target.result
        let collections = JSON.parse(content)
        if (collections[0]) {
          let [name, folders, requests] = Object.keys(collections[0])
          if (name === "name" && folders === "folders" && requests === "requests") {
            // Do nothing
          }
        } else if (collections.info && collections.info.schema.includes("v2.1.0")) {
          //replace the variables, postman uses {{var}}, Hoppscotch uses <<var>>
          collections = JSON.parse(content.replaceAll(/{{([a-z]+)}}/gi, "<<$1>>"))
          collections = [this.parsePostmanCollection(collections)]
        } else {
          this.failedImport()
          return
        }
        if (this.collectionsType.type == "team-collections") {
          team_utils
            .importFromJSON(this.$apollo, collections, this.collectionsType.selectedTeam.id)
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
          this.$store.commit("postwoman/importCollections", { data: collections, flag: "rest" })
          this.syncToFBCollections()
          this.fileImported()
        }
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
      this.$refs.inputChooseFileToImportFrom.value = ""
    },
    importFromMyCollections() {
      team_utils
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
      if (this.collectionsType.type == "my-collections") {
        this.collectionJson = JSON.stringify(this.$store.state.postwoman.collections, null, 2)
      } else {
        this.collectionJson = await team_utils.exportAsJSON(
          this.$apollo,
          this.collectionsType.selectedTeam.id
        )
      }
      console.log(this.collectionJson)
      return this.collectionJson
    },
    exportJSON() {
      let text = this.collectionJson
      text = text.replace(/\n/g, "\r\n")
      let blob = new Blob([text], {
        type: "text/json",
      })
      let anchor = document.createElement("a")
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
    syncCollections() {
      this.$store.commit("postwoman/replaceCollections", {
        data: fb.currentCollections,
        flag: "rest",
      })
      this.fileImported()
    },
    syncToFBCollections() {
      if (fb.currentUser !== null && this.SYNC_COLLECTIONS) {
        fb.writeCollections(
          JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)),
          "collections"
        )
      }
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
      let postwomanCollection = {
        name: "",
        folders: [],
        requests: [],
      }

      postwomanCollection.name = info ? info.name : name

      if (item && item.length > 0) {
        for (let collectionItem of item) {
          if (collectionItem.request) {
            if (postwomanCollection.hasOwnProperty("folders")) {
              postwomanCollection.name = info ? info.name : name
              postwomanCollection.requests.push(this.parsePostmanRequest(collectionItem))
            } else {
              postwomanCollection.name = name ? name : ""
              postwomanCollection.requests.push(this.parsePostmanRequest(collectionItem))
            }
          } else if (this.hasFolder(collectionItem)) {
            postwomanCollection.folders.push(this.parsePostmanCollection(collectionItem))
          } else {
            postwomanCollection.requests.push(this.parsePostmanRequest(collectionItem))
          }
        }
      }
      return postwomanCollection
    },
    parsePostmanRequest({ name, request }) {
      let pwRequest = {
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
        let requestObjectUrl = request.url.raw.match(/^(.+:\/\/[^\/]+|{[^\/]+})(\/[^\?]+|).*$/)
        if (requestObjectUrl) {
          pwRequest.url = requestObjectUrl[1]
          pwRequest.path = requestObjectUrl[2] ? requestObjectUrl[2] : ""
        }
      }
      pwRequest.method = request.method
      let itemAuth = request.auth ? request.auth : ""
      let authType = itemAuth ? itemAuth.type : ""
      if (authType === "basic") {
        pwRequest.auth = "Basic Auth"
        pwRequest.httpUser =
          itemAuth.basic[0].key === "username" ? itemAuth.basic[0].value : itemAuth.basic[1].value
        pwRequest.httpPassword =
          itemAuth.basic[0].key === "password" ? itemAuth.basic[0].value : itemAuth.basic[1].value
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
      let requestObjectHeaders = request.header
      if (requestObjectHeaders) {
        pwRequest.headers = requestObjectHeaders
        for (let header of pwRequest.headers) {
          delete header.name
          delete header.type
        }
      }
      if (request.url) {
        let requestObjectParams = request.url.query
        if (requestObjectParams) {
          pwRequest.params = requestObjectParams
          for (let param of pwRequest.params) {
            delete param.disabled
          }
        }
      }
      if (request.body) {
        if (request.body.mode === "urlencoded") {
          let params = request.body.urlencoded
          pwRequest.bodyParams = params ? params : []
          for (let param of pwRequest.bodyParams) {
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
      return item.hasOwnProperty("item")
    },
  },
}
</script>
