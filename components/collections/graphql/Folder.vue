<template>
  <div>
    <div
      :class="[
        'row-wrapper transition duration-150 ease-in-out',
        { 'bg-primaryDark': dragging },
      ]"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <div>
        <button class="icon" @click="toggleShowChildren">
          <i v-show="!showChildren && !isFiltered" class="material-icons"
            >arrow_right</i
          >
          <i v-show="showChildren || isFiltered" class="material-icons"
            >arrow_drop_down</i
          >
          <i v-if="isSelected" class="mx-3 text-green-400 material-icons"
            >check_circle</i
          >

          <i v-else class="material-icons">folder_open</i>
          <span>{{ folder.name }}</span>
        </button>
      </div>
      <v-popover>
        <button v-tooltip.left="$t('more')" class="tooltip-target icon">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              v-close-popover
              class="icon"
              @click="$emit('add-folder', { folder, path: folderPath })"
            >
              <i class="material-icons">create_new_folder</i>
              <span>{{ $t("new_folder") }}</span>
            </button>
          </div>
          <div>
            <button
              v-close-popover
              class="icon"
              @click="$emit('edit-folder', { folder, folderPath })"
            >
              <i class="material-icons">edit</i>
              <span>{{ $t("edit") }}</span>
            </button>
          </div>
          <div>
            <button v-close-popover class="icon" @click="confirmRemove = true">
              <i class="material-icons">delete</i>
              <span>{{ $t("delete") }}</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>
    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(subFolder, subFolderIndex) in folder.folders"
          :key="subFolder.name"
          class="ml-8 border-l border-divider"
        >
          <CollectionsGraphqlFolder
            :picked="picked"
            :saving-mode="savingMode"
            :folder="subFolder"
            :folder-index="subFolderIndex"
            :folder-path="`${folderPath}/${subFolderIndex}`"
            :collection-index="collectionIndex"
            :doc="doc"
            :is-filtered="isFiltered"
            @add-folder="$emit('add-folder', $event)"
            @edit-folder="$emit('edit-folder', $event)"
            @edit-request="$emit('edit-request', $event)"
            @select="$emit('select', $event)"
          />
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in folder.requests"
          :key="index"
          class="flex ml-8 border-l border-divider"
        >
          <CollectionsGraphqlRequest
            :picked="picked"
            :saving-mode="savingMode"
            :request="request"
            :collection-index="collectionIndex"
            :folder-index="folderIndex"
            :folder-path="folderPath"
            :folder-name="folder.name"
            :request-index="index"
            :doc="doc"
            @edit-request="$emit('edit-request', $event)"
            @select="$emit('select', $event)"
          />
        </li>
      </ul>
      <ul
        v-if="
          folder.folders &&
          folder.folders.length === 0 &&
          folder.requests &&
          folder.requests.length === 0
        "
      >
        <li class="flex ml-8 border-l border-divider">
          <p class="info">
            <i class="material-icons">not_interested</i>
            {{ $t("folder_empty") }}
          </p>
        </li>
      </ul>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_folder')"
      @hide-modal="confirmRemove = false"
      @resolve="removeFolder"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import { removeGraphqlFolder, moveGraphqlRequest } from "~/newstore/collections"

export default Vue.extend({
  name: "Folder",
  props: {
    picked: { type: Object, default: null },
    // Whether the request is in a selectable mode (activates 'select' event)
    savingMode: { type: Boolean, default: false },
    folder: { type: Object, default: () => {} },
    folderIndex: { type: Number, default: null },
    collectionIndex: { type: Number, default: null },
    folderPath: { type: String, default: null },
    doc: Boolean,
    isFiltered: Boolean,
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      confirmRemove: false,
    }
  },
  computed: {
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "gql-my-folder" &&
        this.picked.folderPath === this.folderPath
      )
    },
  },
  methods: {
    pick() {
      this.$emit("select", {
        picked: {
          pickedType: "gql-my-folder",
          folderPath: this.folderPath,
        },
      })
    },
    toggleShowChildren() {
      if (this.savingMode) {
        this.pick()
      }

      this.showChildren = !this.showChildren
    },
    removeFolder() {
      removeGraphqlFolder(this.folderPath)
      this.$toast.error(this.$t("deleted").toString(), {
        icon: "delete",
      })
    },
    dropEvent({ dataTransfer }: any) {
      this.dragging = !this.dragging
      const folderPath = dataTransfer.getData("folderPath")
      const requestIndex = dataTransfer.getData("requestIndex")

      moveGraphqlRequest(folderPath, requestIndex, this.folderPath)
    },
  },
})
</script>
