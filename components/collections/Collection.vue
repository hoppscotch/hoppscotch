<template>
  <div>
    <div
      :class="['row-wrapper transition duration-150 ease-in-out', { 'bg-bgDarkColor': dragging }]"
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
        <span>{{ collection.name ? collection.name : collection.title }}</span>
      </button>
      <div>
        <button
          v-if="doc && !selected"
          class="icon"
          @click="$emit('select-collection')"
          v-tooltip.left="$t('import')"
        >
          <i class="material-icons">check_box_outline_blank</i>
        </button>
        <button
          v-if="doc && selected"
          class="icon"
          @click="$emit('unselect-collection')"
          v-tooltip.left="$t('delete')"
        >
          <i class="material-icons">check_box</i>
        </button>
        <v-popover v-if="!saveRequest">
          <button
            v-if="
              collectionsType.type == 'team-collections' &&
              collectionsType.selectedTeam.myRole !== 'VIEWER'
            "
            class="tooltip-target icon"
            v-tooltip.left="$t('more')"
          >
            <i class="material-icons">more_vert</i>
          </button>
          <template slot="popover">
            <div>
              <button
                v-if="
                  collectionsType.type == 'team-collections' &&
                  collectionsType.selectedTeam.myRole !== 'VIEWER'
                "
                class="icon"
                @click="$emit('add-folder', { folder: collection, path: `${collectionIndex}` })"
                v-close-popover
              >
                <i class="material-icons">create_new_folder</i>
                <span>{{ $t("new_folder") }}</span>
              </button>
            </div>
            <div>
              <button
                v-if="
                  collectionsType.type == 'team-collections' &&
                  collectionsType.selectedTeam.myRole !== 'VIEWER'
                "
                class="icon"
                @click="$emit('edit-collection')"
                v-close-popover
              >
                <i class="material-icons">create</i>
                <span>{{ $t("edit") }}</span>
              </button>
              <button v-else class="icon" @click="$emit('edit-collection')" v-close-popover>
                <i class="material-icons">create</i>
                <span>{{ $t("edit") }}</span>
              </button>
            </div>
            <div>
              <button
                v-if="
                  collectionsType.type == 'team-collections' &&
                  collectionsType.selectedTeam.myRole !== 'VIEWER'
                "
                class="icon"
                @click="confirmRemove = true"
                v-close-popover
              >
                <i class="material-icons">delete</i>
                <span>{{ $t("delete") }}</span>
              </button>
              <button v-else class="icon" @click="confirmRemove = true" v-close-popover>
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
          v-for="(folder, index) in collectionsType.type === 'my-collections'
            ? collection.folders
            : collection.children"
          :key="folder.name ? folder.name : folder.title"
          class="ml-8 border-l border-brdColor"
        >
          <CollectionsFolder
            :folder="folder"
            :folder-index="index"
            :folder-path="`${collectionIndex}/${index}`"
            :collection-index="collectionIndex"
            :doc="doc"
            :saveRequest="saveRequest"
            :collectionsType="collectionsType"
            :isFiltered="isFiltered"
            @add-folder="$emit('add-folder', $event)"
            @edit-folder="$emit('edit-folder', $event)"
            @edit-request="$emit('edit-request', $event)"
            @select-folder="
              $emit('select-folder', {
                name:
                  (collectionsType.type == 'my-collections' ? folder.name : folder.title) +
                  '/' +
                  $event.name,
                id: $event.id,
                reqIdx: $event.reqIdx,
              })
            "
          />
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in collectionsType.type === 'my-collections'
            ? collection.requests
            : collection.requests"
          :key="index"
          class="ml-8 border-l border-brdColor"
        >
          <CollectionsRequest
            :request="
              collectionsType.type === 'my-collections' ? request : JSON.parse(request.request)
            "
            :collection-index="collectionIndex"
            :folder-index="-1"
            :folder-name="collection.name"
            :request-index="collectionsType.type === 'my-collections' ? index : request.id"
            :doc="doc"
            :saveRequest="saveRequest"
            :collectionsType="collectionsType"
            @edit-request="editRequest($event)"
            @select-request="
              $emit('select-folder', {
                name: $event.name,
                id: collection.id,
                reqIdx: $event.idx,
              })
            "
          />
        </li>
      </ul>
      <ul>
        <li
          v-if="
            (collection.folders == undefined || collection.folders.length === 0) &&
            (collection.requests == undefined || collection.requests.length === 0)
          "
          class="flex ml-8 border-l border-brdColor"
        >
          <p class="info">
            <i class="material-icons">not_interested</i> {{ $t("collection_empty") }}
          </p>
        </li>
      </ul>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_collection')"
      @hide-modal="confirmRemove = false"
      @resolve="removeCollection"
    />
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"
import gql from "graphql-tag"

export default {
  props: {
    collectionIndex: Number,
    collection: Object,
    folders: Array,
    requests: Array,
    doc: Boolean,
    isFiltered: Boolean,
    selected: Boolean,
    saveRequest: Boolean,
    collectionsType: Object,
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      selectedFolder: {},
      confirmRemove: false,
      prevCursor: "",
      cursor: "",
      pageNo: 0,
    }
  },
  subscriptions() {
    return {
      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
    }
  },
  methods: {
    editRequest(event) {
      this.$emit("edit-request", event)
      if (this.$props.saveRequest)
        this.$emit("select-folder", {
          name: this.$data.collection.name,
          id: this.$data.collection.id,
          reqIdx: event.requestIndex,
        })
    },
    syncCollections() {
      if (fb.currentUser !== null && this.SYNC_COLLECTIONS) {
        fb.writeCollections(
          JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)),
          "collections"
        )
      }
    },
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select-folder", { name: "", id: this.$props.collection.id, reqIdx: "" })

      this.$emit("expand-collection", this.collection.id)
      this.showChildren = !this.showChildren
    },
    removeCollection() {
      this.$emit("remove-collection", {
        collectionsType: this.collectionsType,
        collectionIndex: this.collectionIndex,
        collectionID: this.collection.id,
      })
      this.confirmRemove = false
    },
    dropEvent({ dataTransfer }) {
      this.dragging = !this.dragging
      const oldCollectionIndex = dataTransfer.getData("oldCollectionIndex")
      const oldFolderIndex = dataTransfer.getData("oldFolderIndex")
      const oldFolderName = dataTransfer.getData("oldFolderName")
      const requestIndex = dataTransfer.getData("requestIndex")
      const flag = "rest"
      this.$store.commit("postwoman/moveRequest", {
        oldCollectionIndex,
        newCollectionIndex: this.$props.collectionIndex,
        newFolderIndex: -1,
        newFolderName: this.$props.collection.name,
        oldFolderIndex,
        oldFolderName,
        requestIndex,
        flag,
      })
      this.syncCollections()
    },
  },
}
</script>
