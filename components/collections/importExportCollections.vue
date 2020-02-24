<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">Import / Export Collections</h3>
            <div>
              <button class="icon" @click="hideModal">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
          <div class="flex-wrap">
            <span
              v-tooltip="{
                content: !fb.currentUser ? $t('login_first') : $t('replace_current'),
              }"
            >
              <button :disabled="!fb.currentUser" class="icon" @click="syncCollections">
                <i class="material-icons">folder_shared</i>
                <span>{{ $t('import_from_sync') }}</span>
              </button>
            </span>
            <button
              class="icon"
              @click="openDialogChooseFileToReplaceWith"
              v-tooltip="$t('replace_current')"
            >
              <i class="material-icons">create_new_folder</i>
              <span>{{ $t('replace_json') }}</span>
              <input
                type="file"
                @change="replaceWithJSON"
                style="display: none;"
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
              <span>{{ $t('import_json') }}</span>
              <input
                type="file"
                @change="importFromJSON"
                style="display: none;"
                ref="inputChooseFileToImportFrom"
                accept="application/json"
              />
            </button>
          </div>
        </li>
      </ul>
    </div>
    <div slot="body">
      <textarea v-model="collectionJson" rows="8"></textarea>
    </div>
    <div slot="footer">
      <div class="flex-wrap">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t('cancel') }}
          </button>
          <button class="icon primary" @click="exportJSON" v-tooltip="$t('download_file')">
            {{ $t('export') }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
import { fb } from '../../functions/fb'

export default {
  data() {
    return {
      fb,
    }
  },
  props: {
    show: Boolean,
  },
  components: {
    modal: () => import('../../components/modal'),
  },
  computed: {
    collectionJson() {
      return JSON.stringify(this.$store.state.postwoman.collections, null, 2)
    },
  },
  methods: {
    hideModal() {
      this.$emit('hide-modal')
    },
    openDialogChooseFileToReplaceWith() {
      this.$refs.inputChooseFileToReplaceWith.click()
    },
    openDialogChooseFileToImportFrom() {
      this.$refs.inputChooseFileToImportFrom.click()
    },
    replaceWithJSON() {
      let reader = new FileReader()
      reader.onload = event => {
        let content = event.target.result
        let collections = JSON.parse(content)
        if (collections[0]) {
          let [name, folders, requests] = Object.keys(collections[0])
          if (name === 'name' && folders === 'folders' && requests === 'requests') {
            // Do nothing
          }
        } else if (collections.info && collections.info.schema.includes('v2.1.0')) {
          collections = this.parsePostmanCollection(collections)
        } else {
          return this.failedImport()
        }
        this.$store.commit('postwoman/importCollections', collections)
        this.fileImported()
      }
      reader.readAsText(this.$refs.inputChooseFileToReplaceWith.files[0])
    },
    importFromJSON() {
      let reader = new FileReader()
      reader.onload = event => {
        let content = event.target.result
        let collections = JSON.parse(content)
        if (collections[0]) {
          let [name, folders, requests] = Object.keys(collections[0])
          if (name === 'name' && folders === 'folders' && requests === 'requests') {
            // Do nothing
          }
        } else if (collections.info && collections.info.schema.includes('v2.1.0')) {
          collections = this.parsePostmanCollection(collections)
        } else {
          return this.failedImport()
        }
        this.$store.commit('postwoman/importCollections', collections)
        this.fileImported()
      }
      reader.readAsText(this.$refs.inputChooseFileToImportFrom.files[0])
    },
    exportJSON() {
      let text = this.collectionJson
      text = text.replace(/\n/g, '\r\n')
      let blob = new Blob([text], {
        type: 'text/json',
      })
      let anchor = document.createElement('a')
      anchor.download = 'postwoman-collection.json'
      anchor.href = window.URL.createObjectURL(blob)
      anchor.target = '_blank'
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      this.$toast.success(this.$t('download_started'), {
        icon: 'done',
      })
    },
    syncCollections() {
      this.$store.commit('postwoman/replaceCollections', fb.currentCollections)
      this.fileImported()
    },
    fileImported() {
      this.$toast.info(this.$t('file_imported'), {
        icon: 'folder_shared',
      })
    },
    failedImport() {
      this.$toast.error(this.$t('import_failed'), {
        icon: 'error',
      })
    },
    parsePostmanCollection(collection, folders = true) {
      let postwomanCollection = folders
        ? [
            {
              name: '',
              folders: [],
              requests: [],
            },
          ]
        : {
            name: '',
            requests: [],
          }
      for (let collectionItem of collection.item) {
        if (collectionItem.request) {
          if (postwomanCollection[0]) {
            postwomanCollection[0].name = collection.info ? collection.info.name : ''
            postwomanCollection[0].requests.push(this.parsePostmanRequest(collectionItem))
          } else {
            postwomanCollection.name = collection.name ? collection.name : ''
            postwomanCollection.requests.push(this.parsePostmanRequest(collectionItem))
          }
        } else if (collectionItem.item) {
          if (collectionItem.item[0]) {
            postwomanCollection[0].folders.push(this.parsePostmanCollection(collectionItem, false))
          }
        }
      }
      return postwomanCollection
    },
    parsePostmanRequest(requestObject) {
      let pwRequest = {
        url: '',
        path: '',
        method: '',
        auth: '',
        httpUser: '',
        httpPassword: '',
        passwordFieldType: 'password',
        bearerToken: '',
        headers: [],
        params: [],
        bodyParams: [],
        rawParams: '',
        rawInput: false,
        contentType: '',
        requestType: '',
        name: '',
      }

      pwRequest.name = requestObject.name
      let requestObjectUrl = requestObject.request.url.raw.match(
        /^(.+:\/\/[^\/]+|{[^\/]+})(\/[^\?]+|).*$/
      )
      pwRequest.url = requestObjectUrl[1]
      pwRequest.path = requestObjectUrl[2] ? requestObjectUrl[2] : ''
      pwRequest.method = requestObject.request.method
      let itemAuth = requestObject.request.auth ? requestObject.request.auth : ''
      let authType = itemAuth ? itemAuth.type : ''
      if (authType === 'basic') {
        pwRequest.auth = 'Basic Auth'
        pwRequest.httpUser =
          itemAuth.basic[0].key === 'username' ? itemAuth.basic[0].value : itemAuth.basic[1].value
        pwRequest.httpPassword =
          itemAuth.basic[0].key === 'password' ? itemAuth.basic[0].value : itemAuth.basic[1].value
      } else if (authType === 'oauth2') {
        pwRequest.auth = 'OAuth 2.0'
        pwRequest.bearerToken =
          itemAuth.oauth2[0].key === 'accessToken'
            ? itemAuth.oauth2[0].value
            : itemAuth.oauth2[1].value
      } else if (authType === 'bearer') {
        pwRequest.auth = 'Bearer Token'
        pwRequest.bearerToken = itemAuth.bearer[0].value
      }
      let requestObjectHeaders = requestObject.request.header
      if (requestObjectHeaders) {
        pwRequest.headers = requestObjectHeaders
        for (let header of pwRequest.headers) {
          delete header.name
          delete header.type
        }
      }
      let requestObjectParams = requestObject.request.url.query
      if (requestObjectParams) {
        pwRequest.params = requestObjectParams
        for (let param of pwRequest.params) {
          delete param.disabled
        }
      }
      if (requestObject.request.body) {
        if (requestObject.request.body.mode === 'urlencoded') {
          let params = requestObject.request.body.urlencoded
          pwRequest.bodyParams = params ? params : []
          for (let param of pwRequest.bodyParams) {
            delete param.type
          }
        } else if (requestObject.request.body.mode === 'raw') {
          pwRequest.rawInput = true
          pwRequest.rawParams = requestObject.request.body.raw
        }
      }
      return pwRequest
    },
  },
}
</script>
