<template>
  <AppSection
    label="collections"
    :class="{ 'rounded border border-divider': savingMode }"
  >
    <div
      class="
        divide-y divide-dividerLight
        border-b border-dividerLight
        flex flex-col
        top-0
        z-10
        sticky
      "
      :class="{ 'bg-primary': !savingMode }"
    >
      <input
        v-if="showCollActions"
        v-model="filterText"
        type="search"
        autocomplete="off"
        :placeholder="$t('action.search')"
        class="bg-transparent flex w-full py-2 px-4"
      />
      <div class="flex flex-1 justify-between">
        <ButtonSecondary
          svg="plus"
          :label="$t('action.new')"
          class="!rounded-none"
          @click.native="displayModalAdd(true)"
        />
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/features/collections"
            blank
            :title="$t('app.wiki')"
            svg="help-circle"
          />
          <ButtonSecondary
            v-if="showCollActions"
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('modal.import_export')"
            svg="archive"
            @click.native="displayModalImportExport(true)"
          />
        </div>
      </div>
    </div>
    <div class="flex-col">
      <CollectionsGraphqlCollection
        v-for="(collection, index) in filteredCollections"
        :key="`collection-${index}`"
        :picked="picked"
        :name="collection.name"
        :collection-index="index"
        :collection="collection"
        :doc="doc"
        :is-filtered="filterText.length > 0"
        :saving-mode="savingMode"
        @edit-collection="editCollection(collection, index)"
        @add-folder="addFolder($event)"
        @edit-folder="editFolder($event)"
        @edit-request="editRequest($event)"
        @select-collection="$emit('use-collection', collection)"
        @select="$emit('select', $event)"
      />
    </div>
    <div
      v-if="collections.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <img
        :src="`/images/states/${$colorMode.value}/pack.svg`"
        loading="lazy"
        class="flex-col my-4 object-contain object-center h-16 w-16 inline-flex"
        :alt="$t('empty.collections')"
      />
      <span class="text-center pb-4">
        {{ $t("empty.collections") }}
      </span>
      <ButtonSecondary
        :label="$t('add.new')"
        filled
        @click.native="displayModalAdd(true)"
      />
    </div>
    <div
      v-if="!(filteredCollections.length !== 0 || collections.length === 0)"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">manage_search</i>
      <span class="text-center">
        {{ $t("state.nothing_found") }} "{{ filterText }}"
      </span>
    </div>
    <CollectionsGraphqlAdd
      :show="showModalAdd"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsGraphqlEdit
      :show="showModalEdit"
      :editing-collection="editingCollection"
      :editing-collection-index="editingCollectionIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <CollectionsGraphqlAddFolder
      :show="showModalAddFolder"
      :folder-path="editingFolderPath"
      @add-folder="onAddFolder($event)"
      @hide-modal="displayModalAddFolder(false)"
    />
    <CollectionsGraphqlEditFolder
      :show="showModalEditFolder"
      :collection-index="editingCollectionIndex"
      :folder="editingFolder"
      :folder-index="editingFolderIndex"
      :folder-path="editingFolderPath"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsGraphqlEditRequest
      :show="showModalEditRequest"
      :folder-path="editingFolderPath"
      :request="editingRequest"
      :request-index="editingRequestIndex"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsGraphqlImportExport
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
  </AppSection>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import clone from "lodash/clone"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { graphqlCollections$, addGraphqlFolder } from "~/newstore/collections"

export default defineComponent({
  props: {
    // Whether to activate the ability to pick items (activates 'select' events)
    savingMode: { type: Boolean, default: false },
    doc: { type: Boolean, default: false },
    picked: { type: Object, default: null },
    // Whether to show the 'New' and 'Import/Export' actions
    showCollActions: { type: Boolean, default: true },
  },
  setup() {
    return {
      collections: useReadonlyStream(graphqlCollections$, []),
    }
  },
  data() {
    return {
      showModalAdd: false,
      showModalEdit: false,
      showModalImportExport: false,
      showModalAddFolder: false,
      showModalEditFolder: false,
      showModalEditRequest: false,
      editingCollection: undefined,
      editingCollectionIndex: undefined,
      editingFolder: undefined,
      editingFolderName: undefined,
      editingFolderIndex: undefined,
      editingFolderPath: undefined,
      editingRequest: undefined,
      editingRequestIndex: undefined,
      filterText: "",
    }
  },
  computed: {
    filteredCollections() {
      const collections = clone(this.collections)

      if (!this.filterText) return collections

      const filterText = this.filterText.toLowerCase()
      const filteredCollections = []

      for (const collection of collections) {
        const filteredRequests = []
        const filteredFolders = []
        for (const request of collection.requests) {
          if (request.name.toLowerCase().includes(filterText))
            filteredRequests.push(request)
        }
        for (const folder of collection.folders) {
          const filteredFolderRequests = []
          for (const request of folder.requests) {
            if (request.name.toLowerCase().includes(filterText))
              filteredFolderRequests.push(request)
          }
          if (filteredFolderRequests.length > 0) {
            const filteredFolder = Object.assign({}, folder)
            filteredFolder.requests = filteredFolderRequests
            filteredFolders.push(filteredFolder)
          }
        }

        if (filteredRequests.length + filteredFolders.length > 0) {
          const filteredCollection = Object.assign({}, collection)
          filteredCollection.requests = filteredRequests
          filteredCollection.folders = filteredFolders
          filteredCollections.push(filteredCollection)
        }
      }

      return filteredCollections
    },
  },
  methods: {
    displayModalAdd(shouldDisplay) {
      this.showModalAdd = shouldDisplay
    },
    displayModalEdit(shouldDisplay) {
      this.showModalEdit = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalImportExport(shouldDisplay) {
      this.showModalImportExport = shouldDisplay
    },
    displayModalAddFolder(shouldDisplay) {
      this.showModalAddFolder = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalEditFolder(shouldDisplay) {
      this.showModalEditFolder = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalEditRequest(shouldDisplay) {
      this.showModalEditRequest = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    editCollection(collection, collectionIndex) {
      this.$data.editingCollection = collection
      this.$data.editingCollectionIndex = collectionIndex
      this.displayModalEdit(true)
    },
    onAddFolder({ name, path }) {
      addGraphqlFolder(name, path)
      this.displayModalAddFolder(false)
    },
    addFolder(payload) {
      const { path } = payload
      this.$data.editingFolderPath = path
      this.displayModalAddFolder(true)
    },
    editFolder(payload) {
      const { folder, folderPath } = payload
      this.editingFolder = folder
      this.editingFolderPath = folderPath
      this.displayModalEditFolder(true)
    },
    editRequest(payload) {
      const {
        collectionIndex,
        folderIndex,
        folderName,
        request,
        requestIndex,
        folderPath,
      } = payload
      this.$data.editingFolderPath = folderPath
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolderIndex = folderIndex
      this.$data.editingFolderName = folderName
      this.$data.editingRequest = request
      this.$data.editingRequestIndex = requestIndex
      this.displayModalEditRequest(true)
    },
    resetSelectedData() {
      this.$data.editingCollection = undefined
      this.$data.editingCollectionIndex = undefined
      this.$data.editingFolder = undefined
      this.$data.editingFolderIndex = undefined
      this.$data.editingRequest = undefined
      this.$data.editingRequestIndex = undefined
    },
  },
})
</script>
