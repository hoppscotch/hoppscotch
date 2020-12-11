<template>
  <div>
    <div
      :class="['row-wrapper', dragging ? 'drop-zone' : '']"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <button class="icon" @click="toggleShowChildren">
        <i class="material-icons" v-show="!showChildren && !isFiltered">arrow_right</i>
        <i class="material-icons" v-show="showChildren || isFiltered">arrow_drop_down</i>
        <i class="material-icons">folder</i>
        <span>{{ collection.name }}</span>
      </button>
      <div>
        <button
          v-if="doc"
          class="icon"
          @click="$emit('select-collection')"
          v-tooltip.left="$t('import')"
        >
          <i class="material-icons">topic</i>
        </button>
        <v-popover>
          <button class="tooltip-target icon" v-tooltip.left="$t('more')">
            <i class="material-icons">more_vert</i>
          </button>
          <template slot="popover">
            <div>
              <button
                class="icon"
                @click="$emit('add-folder', { folder: collection, path: `${collectionIndex}` })"
                v-close-popover
              >
                <i class="material-icons">create_new_folder</i>
                <span>{{ $t("new_folder") }}</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="$emit('edit-collection')" v-close-popover>
                <i class="material-icons">create</i>
                <span>{{ $t("edit") }}</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="removeCollection" v-close-popover>
                <i class="material-icons">delete</i>
                <span>{{ $t("delete") }}</span>
              </button>
            </div>
          </template>
        </v-popover>
      </div>
    </div>
    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(folder, index) in collection.folders"
          :key="folder.name"
          class="ml-8 border-l border-brdColor"
        >
          <folder
            :folder="folder"
            :folder-index="index"
            :folder-path="`${collectionIndex}/${index}`"
            :collection-index="collectionIndex"
            :doc="doc"
            :isFiltered="isFiltered"
            @add-folder="$emit('add-folder', $event)"
            @edit-folder="$emit('edit-folder', $event)"
            @edit-request="$emit('edit-request', $event)"
          />
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in collection.requests"
          :key="index"
          class="ml-8 border-l border-brdColor"
        >
          <request
            :request="request"
            :collection-index="collectionIndex"
            :folder-index="-1"
            :folder-name="collection.name"
            :request-index="index"
            :doc="doc"
            @edit-request="$emit('edit-request', $event)"
          />
        </li>
      </ul>
      <ul>
        <li
          v-if="collection.folders.length === 0 && collection.requests.length === 0"
          class="flex ml-8 border-l border-brdColor"
        >
          <p class="info">
            <i class="material-icons">not_interested</i> {{ $t("collection_empty") }}
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  props: {
    collectionIndex: Number,
    collection: Object,
    doc: Boolean,
    isFiltered: Boolean,
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      selectedFolder: {},
    }
  },
  methods: {
    syncCollections() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
      }
    },
    toggleShowChildren() {
      this.showChildren = !this.showChildren
    },
    removeCollection() {
      if (!confirm(this.$t("are_you_sure_remove_collection"))) return
      this.$store.commit("postwoman/removeCollection", {
        collectionIndex: this.collectionIndex,
      })
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
      this.syncCollections()
    },
    dropEvent({ dataTransfer }) {
      this.dragging = !this.dragging
      const oldCollectionIndex = dataTransfer.getData("oldCollectionIndex")
      const oldFolderIndex = dataTransfer.getData("oldFolderIndex")
      const oldFolderName = dataTransfer.getData("oldFolderName")
      const requestIndex = dataTransfer.getData("requestIndex")
      this.$store.commit("postwoman/moveRequest", {
        oldCollectionIndex,
        newCollectionIndex: this.$props.collectionIndex,
        newFolderIndex: -1,
        newFolderName: this.$props.collection.name,
        oldFolderIndex,
        oldFolderName,
        requestIndex,
      })
      this.syncCollections()
    },
  },
}
</script>
