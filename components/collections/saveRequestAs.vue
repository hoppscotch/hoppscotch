<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">{{ $t("save_request_as") }}</h3>
            <div>
              <button class="icon" @click="hideModal">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div slot="body">
      <ul>
        <li>
          <label for="selectLabel">{{ $t("label") }}</label>
          <input
            type="text"
            id="selectLabel"
            v-model="requestData.name"
            :placeholder="defaultRequestName"
            @keyup.enter="saveRequestAs"
          />
          <label for="selectCollection">{{ $t("collection") }}</label>
          <span class="select-wrapper">
            <select type="text" id="selectCollection" v-model="requestData.collectionIndex">
              <option :key="undefined" :value="undefined" hidden disabled selected>{{
                $t("select_collection")
              }}</option>
              <option
                v-for="(collection, index) in $store.state.postwoman.collections"
                :key="index"
                :value="index"
              >
                {{ collection.name }}
              </option>
            </select>
          </span>
          <label for="selectFolder">{{ $t("folder") }}</label>
          <span class="select-wrapper">
            <select type="text" id="selectFolder" v-model="requestData.folderIndex">
              <option :key="undefined" :value="undefined">/</option>
              <option v-for="(folder, index) in folders" :key="index" :value="index">
                {{ folder.name }}
              </option>
            </select>
          </span>
          <label for="selectRequest">{{ $t("request") }}</label>
          <span class="select-wrapper">
            <select type="text" id="selectRequest" v-model="requestData.requestIndex">
              <option :key="undefined" :value="undefined">/</option>
              <option v-for="(folder, index) in requests" :key="index" :value="index">
                {{ folder.name }}
              </option>
            </select>
          </span>
        </li>
      </ul>
    </div>
    <div slot="footer">
      <div class="flex-wrap">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="saveRequestAs">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  props: {
    show: Boolean,
    editingRequest: Object,
  },
  components: {
    modal: () => import("~/components/ui/modal"),
  },
  data() {
    return {
      defaultRequestName: "My Request",
      requestData: {
        name: undefined,
        collectionIndex: undefined,
        folderIndex: undefined,
        requestIndex: undefined,
      },
    }
  },
  watch: {
    "requestData.collectionIndex": function resetFolderAndRequestIndex() {
      // if user choosen some folder, than selected other collection, which doesn't have any folders
      // than `requestUpdateData.folderIndex` won't be reseted
      this.$data.requestData.folderIndex = undefined
      this.$data.requestData.requestIndex = undefined
    },
    "requestData.folderIndex": function resetRequestIndex() {
      this.$data.requestData.requestIndex = undefined
    },
    editingRequest(request) {
      this.defaultRequestName = request.label || "My Request"
    },
  },
  computed: {
    folders() {
      const userSelectedAnyCollection = this.$data.requestData.collectionIndex !== undefined
      if (!userSelectedAnyCollection) return []

      const noCollectionAvailable =
        this.$store.state.postwoman.collections[this.$data.requestData.collectionIndex] !==
        undefined
      if (!noCollectionAvailable) return []

      return this.$store.state.postwoman.collections[this.$data.requestData.collectionIndex].folders
    },
    requests() {
      const userSelectedAnyCollection = this.$data.requestData.collectionIndex !== undefined
      if (!userSelectedAnyCollection) return []

      const userSelectedAnyFolder = this.$data.requestData.folderIndex !== undefined
      if (userSelectedAnyFolder) {
        const collection = this.$store.state.postwoman.collections[
          this.$data.requestData.collectionIndex
        ]
        const folder = collection.folders[this.$data.requestData.folderIndex]
        const requests = folder.requests
        return requests
      } else {
        const collection = this.$store.state.postwoman.collections[
          this.$data.requestData.collectionIndex
        ]
        const noCollectionAvailable =
          this.$store.state.postwoman.collections[this.$data.requestData.collectionIndex] !==
          undefined
        if (!noCollectionAvailable) return []

        const requests = collection.requests
        return requests
      }
    },
  },
  methods: {
    syncCollections() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
      }
    },
    saveRequestAs() {
      const userDidntSpecifyCollection = this.$data.requestData.collectionIndex === undefined
      if (userDidntSpecifyCollection) {
        this.$toast.error(this.$t("select_collection"), {
          icon: "error",
        })
        return
      }

      const requestUpdated = {
        ...this.$props.editingRequest,
        name: this.$data.requestData.name || this.$data.defaultRequestName,
        collection: this.$data.requestData.collectionIndex,
      }

      this.$store.commit("postwoman/saveRequestAs", {
        request: requestUpdated,
        collectionIndex: this.$data.requestData.collectionIndex,
        folderIndex: this.$data.requestData.folderIndex,
        requestIndex: this.$data.requestData.requestIndex,
      })

      this.hideModal()
      this.syncCollections()
    },
    hideModal() {
      this.$emit("hide-modal")
      this.$emit("hide-model") // for backward compatibility  // TODO: use fixed event
    },
  },
}
</script>
