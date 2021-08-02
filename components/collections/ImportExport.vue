<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("import_export") }} {{ $t("collections") }}</h3>
      <div class="flex">
        <ButtonSecondary
          v-if="mode == 'import_from_my_collections'"
          v-tippy="{ theme: 'tooltip' }"
          title="Back"
          icon="arrow_back"
          @click.native="
            mode = 'import_export'
            mySelectedCollectionID = undefined
          "
        />
        <tippy
          v-if="
            mode == 'import_export' && collectionsType.type == 'my-collections'
          "
          ref="options"
          interactive
          tabindex="-1"
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <TabPrimary
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
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div v-if="mode == 'import_export'" class="flex flex-col space-y-2">
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
          style="display: none"
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
          style="display: none"
          accept="application/json"
          @change="importFromJSON"
        />
        <SmartItem
          v-if="collectionsType.type == 'team-collections'"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('preserve_current')"
          icon="folder_shared"
          :label="$t('import.from_my_collections')"
          @click.native="mode = 'import_from_my_collections'"
        />
        <SmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('download_file')"
          icon="drive_file_move"
          :label="$t('export.as_json')"
          @click.native="exportJSON"
        />
      </div>
      <div
        v-if="mode == 'import_from_my_collections'"
        class="flex flex-col px-2"
      >
        <div class="select-wrapper">
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
              :key="`collection-${index}`"
              :value="index"
            >
              {{ collection.name }}
            </option>
          </select>
        </div>
      </div>
    </template>
    <template #footer>
      <div v-if="mode == 'import_from_my_collections'">
        <span>
          <ButtonPrimary
            :disabled="mySelectedCollectionID == undefined"
            icon="create_new_folder"
            :label="$t('import.title')"
            @click.native="importFromMyCollections"
          />
        </span>
      </div>
    </template>
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
          this.$toast.success(this.$t("export.gist_created"), {
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
