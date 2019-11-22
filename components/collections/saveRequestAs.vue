<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">
              Save Request As
            </h3>
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
          <label for="selectLabel">Label</label>
          <input
            id="selectLabel"
            v-model="requestData.name"
            type="text"
            :placeholder="defaultRequestName"
            list="preCollectionLabels"
            @keyup.enter="saveRequestAs"
          />
          <datalist id="preCollectionLabels">
            <option value="Login" />
            <option value="Logout" />
            <option value="Bug" />
            <option value="Users" />
          </datalist>
          <label for="selectCollection">Collection</label>
          <select
            id="selectCollection"
            v-model="requestData.collectionIndex"
            type="text"
          >
            <option
              :key="undefined"
              :value="undefined"
              hidden
              disabled
              selected
            >
              Select a Collection
            </option>
            <option
              v-for="(collection, index) in $store.state.postwoman.collections"
              :key="index"
              :value="index"
            >
              {{ collection.name }}
            </option>
          </select>
          <label for="selectFolder">Folder</label>
          <select
            id="selectFolder"
            v-model="requestData.folderIndex"
            type="text"
          >
            <option :key="undefined" :value="undefined">
              /
            </option>
            <option
              v-for="(folder, index) in folders"
              :key="index"
              :value="index"
            >
              {{ folder.name }}
            </option>
          </select>
          <label for="selectRequest">Request</label>
          <select
            id="selectRequest"
            v-model="requestData.requestIndex"
            type="text"
          >
            <option :key="undefined" :value="undefined">
              /
            </option>
            <option
              v-for="(folder, index) in requests"
              :key="index"
              :value="index"
            >
              {{ folder.name }}
            </option>
          </select>
        </li>
      </ul>
    </div>
    <div slot="footer">
      <ul>
        <li>
          <button class="icon" @click="saveRequestAs">
            <i class="material-icons">save</i>
            <span>Save</span>
          </button>
        </li>
      </ul>
    </div>
  </modal>
</template>

<script>
export default {
  components: {
    modal: () => import("../../components/modal")
  },
  props: {
    show: Boolean,
    editingRequest: Object
  },
  data() {
    return {
      defaultRequestName: "My Request",
      requestData: {
        name: undefined,
        collectionIndex: undefined,
        folderIndex: undefined,
        requestIndex: undefined
      }
    }
  },
  computed: {
    folders() {
      const userSelectedAnyCollection =
        this.$data.requestData.collectionIndex !== undefined
      if (!userSelectedAnyCollection) return []

      return this.$store.state.postwoman.collections[
        this.$data.requestData.collectionIndex
      ].folders
    },
    requests() {
      const userSelectedAnyCollection =
        this.$data.requestData.collectionIndex !== undefined
      if (!userSelectedAnyCollection) return []

      const userSelectedAnyFolder =
        this.$data.requestData.folderIndex !== undefined
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
        const requests = collection.requests
        return requests
      }
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
    }
  },
  methods: {
    saveRequestAs() {
      const userDidntSpecifyCollection =
        this.$data.requestData.collectionIndex === undefined
      if (userDidntSpecifyCollection) {
        this.$toast.error("Select a Collection", {
          icon: "error"
        })
        return
      }

      const requestUpdated = {
        ...this.$props.editingRequest,
        name: this.$data.requestData.name || this.$data.defaultRequestName,
        collection: this.$data.requestData.collectionIndex
      }

      this.$store.commit("postwoman/saveRequestAs", {
        request: requestUpdated,
        collectionIndex: this.$data.requestData.collectionIndex,
        folderIndex: this.$data.requestData.folderIndex,
        requestIndex: this.$data.requestData.requestIndex
      })

      this.hideModal()
    },
    hideModal() {
      this.$emit("hide-modal")
      this.$emit("hide-model") // for backward compatibility  // TODO: use fixed event
    }
  }
}
</script>
