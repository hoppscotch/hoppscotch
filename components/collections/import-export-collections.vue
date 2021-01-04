<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("import_export") }} {{ $t("collections") }}</h3>
        <div>
          <v-popover>
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
      <div class="flex flex-col items-start p-2">
        <span
          v-tooltip="{
            content: !fb.currentUser ? $t('login_first') : $t('replace_current'),
          }"
        >
          <button :disabled="!fb.currentUser" class="icon" @click="syncCollections">
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
      <div v-if="showJsonCode" class="row-wrapper">
        <textarea v-model="collectionJson" rows="8" readonly></textarea>
      </div>
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span>
          <pw-toggle :on="showJsonCode" @change="showJsonCode = $event">
            {{ $t("show_code") }}
          </pw-toggle>
        </span>
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

export default {
  data() {
    return {
      fb,
      showJsonCode: false,
    }
  },
  props: {
    show: Boolean,
  },
  computed: {
    collectionJson() {
      return JSON.stringify(this.$store.state.postwoman.collections, null, 2)
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
          this.$store.commit("postwoman/replaceCollections", collections)
          this.fileImported()
          this.syncToFBCollections()
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
          return this.failedImport()
        }
        this.$store.commit("postwoman/replaceCollections", collections)
        this.fileImported()
        this.syncToFBCollections()
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
          return this.failedImport()
        }
        this.$store.commit("postwoman/importCollections", collections)
        this.fileImported()
        this.syncToFBCollections()
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
      this.$refs.inputChooseFileToImportFrom.value = ""
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
      this.$store.commit("postwoman/replaceCollections", fb.currentCollections)
      this.fileImported()
    },
    syncToFBCollections() {
      if (fb.currentUser !== null && fb.currentSettings[0]) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
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
      let requestObjectUrl = request.url.raw.match(/^(.+:\/\/[^\/]+|{[^\/]+})(\/[^\?]+|).*$/)
      if (requestObjectUrl) {
        pwRequest.url = requestObjectUrl[1]
        pwRequest.path = requestObjectUrl[2] ? requestObjectUrl[2] : ""
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
      let requestObjectParams = request.url.query
      if (requestObjectParams) {
        pwRequest.params = requestObjectParams
        for (let param of pwRequest.params) {
          delete param.disabled
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
