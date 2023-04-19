<template>
  <div :class="{ 'rounded border border-divider': saveRequest }">
    <div
      class="sticky z-10 flex flex-col flex-shrink-0 overflow-x-auto rounded-t bg-primary"
      :style="
        saveRequest ? 'top: calc(-1 * var(--line-height-body))' : 'top: 0'
      "
    >
      <input
        v-model="filterText"
        type="search"
        autocomplete="off"
        :placeholder="t('action.search')"
        class="py-2 pl-4 pr-2 bg-transparent"
      />
      <div
        class="flex justify-between flex-1 flex-shrink-0 border-y bg-primary border-dividerLight"
      >
        <HoppButtonSecondary
          :icon="IconPlus"
          :label="t('action.new')"
          class="!rounded-none"
          @click="displayModalAdd(true)"
        />
        <div class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/documentation/features/collections"
            blank
            :title="t('app.wiki')"
            :icon="IconHelpCircle"
          />
          <HoppButtonSecondary
            v-if="!saveRequest"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('modal.import_export')"
            :icon="IconArchive"
            @click="displayModalImportExport(true)"
          />
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <CollectionsGraphqlCollection
        v-for="(collection, index) in filteredCollections"
        :key="`collection-${index}`"
        :picked="picked"
        :name="collection.name"
        :collection-index="index"
        :collection="collection"
        :is-filtered="filterText.length > 0"
        :save-request="saveRequest"
        @edit-collection="editCollection(collection, index)"
        @add-request="addRequest($event)"
        @add-folder="addFolder($event)"
        @edit-folder="editFolder($event)"
        @edit-request="editRequest($event)"
        @duplicate-request="duplicateRequest($event)"
        @select-collection="$emit('use-collection', collection)"
        @select="$emit('select', $event)"
      />
    </div>
    <div
      v-if="collections.length === 0"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${colorMode.value}/pack.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="t('empty.collections')"
      />
      <span class="pb-4 text-center">
        {{ t("empty.collections") }}
      </span>
      <HoppButtonSecondary
        :label="t('add.new')"
        filled
        outline
        @click="displayModalAdd(true)"
      />
    </div>
    <div
      v-if="!(filteredCollections.length !== 0 || collections.length === 0)"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <icon-lucide-search class="pb-2 opacity-75 svg-icons" />
      <span class="my-2 text-center">
        {{ t("state.nothing_found") }} "{{ filterText }}"
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
      :editing-collection-name="editingCollection ? editingCollection.name : ''"
      @hide-modal="displayModalEdit(false)"
    />
    <CollectionsGraphqlAddRequest
      :show="showModalAddRequest"
      :folder-path="editingFolderPath"
      @add-request="onAddRequest($event)"
      @hide-modal="displayModalAddRequest(false)"
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
      :editing-folder-name="editingFolder ? editingFolder.name : ''"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsGraphqlEditRequest
      :show="showModalEditRequest"
      :folder-path="editingFolderPath"
      :request="editingRequest"
      :request-index="editingRequestIndex"
      :editing-request-name="editingRequest ? editingRequest.name : ''"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsGraphqlImportExport
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
  </div>
</template>

<script lang="ts">
// TODO: TypeScript + Script Setup this :)
import { defineComponent } from "vue"
import { cloneDeep, clone } from "lodash-es"
import {
  graphqlCollections$,
  addGraphqlFolder,
  saveGraphqlRequestAs,
} from "~/newstore/collections"
import { getGQLSession, setGQLSession } from "~/newstore/GQLSession"

import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconArchive from "~icons/lucide/archive"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useColorMode } from "@composables/theming"

export default defineComponent({
  props: {
    // Whether to activate the ability to pick items (activates 'select' events)
    saveRequest: { type: Boolean, default: false },
    picked: { type: Object, default: null },
  },
  emits: ["select", "use-collection"],
  setup() {
    const collections = useReadonlyStream(graphqlCollections$, [], "deep")
    const colorMode = useColorMode()
    const t = useI18n()

    return {
      collections,
      colorMode,
      t,
      IconPlus,
      IconHelpCircle,
      IconArchive,
    }
  },
  data() {
    return {
      showModalAdd: false,
      showModalEdit: false,
      showModalImportExport: false,
      showModalAddRequest: false,
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
    displayModalAddRequest(shouldDisplay) {
      this.showModalAddRequest = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
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
    onAddRequest({ name, path }) {
      const newRequest = {
        ...getGQLSession().request,
        name,
      }

      saveGraphqlRequestAs(path, newRequest)
      setGQLSession({
        request: newRequest,
        schema: "",
        response: "",
      })

      this.displayModalAddRequest(false)
    },
    addRequest(payload) {
      const { path } = payload
      this.$data.editingFolderPath = path
      this.displayModalAddRequest(true)
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
    duplicateRequest({ folderPath, request }) {
      saveGraphqlRequestAs(folderPath, {
        ...cloneDeep(request),
        name: `${request.name} - ${this.t("action.duplicate")}`,
      })
    },
  },
})
</script>
