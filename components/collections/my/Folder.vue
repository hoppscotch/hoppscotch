<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-center group"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <span
        class="cursor-pointer flex w-10 justify-center items-center truncate"
        @click="toggleShowChildren()"
      >
        <i class="material-icons" :class="{ 'text-green-500': isSelected }">
          {{ getCollectionIcon }}
        </i>
      </span>
      <span
        class="
          cursor-pointer
          flex
          font-semibold
          flex-1
          min-w-0
          py-2
          pr-2
          transition
          group-hover:text-secondaryDark
        "
        @click="toggleShowChildren()"
      >
        <span class="truncate">
          {{ folder.name ? folder.name : folder.title }}
        </span>
      </span>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        icon="create_new_folder"
        :title="$t('folder.new')"
        class="hidden group-hover:inline-flex"
        @click.native="$emit('add-folder', { folder, path: folderPath })"
      />
      <tippy ref="options" interactive trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('more')"
            icon="more_vert"
          />
        </template>
        <SmartItem
          icon="create_new_folder"
          :label="$t('folder.new')"
          @click.native="
            $emit('add-folder', { folder, path: folderPath })
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          icon="edit"
          :label="$t('edit')"
          @click.native="
            $emit('edit-folder', {
              folder,
              folderIndex,
              collectionIndex,
              folderPath,
            })
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          icon="delete"
          color="red"
          :label="$t('delete')"
          @click.native="
            confirmRemove = true
            $refs.options.tippy().hide()
          "
        />
      </tippy>
    </div>
    <div v-if="showChildren || isFiltered">
      <CollectionsMyFolder
        v-for="(subFolder, subFolderIndex) in folder.folders"
        :key="`subFolder-${subFolderIndex}`"
        class="border-l border-dividerLight ml-5"
        :folder="subFolder"
        :folder-index="subFolderIndex"
        :collection-index="collectionIndex"
        :doc="doc"
        :save-request="saveRequest"
        :collections-type="collectionsType"
        :folder-path="`${folderPath}/${subFolderIndex}`"
        :picked="picked"
        @add-folder="$emit('add-folder', $event)"
        @edit-folder="$emit('edit-folder', $event)"
        @edit-request="$emit('edit-request', $event)"
        @update-team-collections="$emit('update-team-collections')"
        @select="$emit('select', $event)"
        @remove-request="removeRequest"
      />
      <CollectionsMyRequest
        v-for="(request, index) in folder.requests"
        :key="`request-${index}`"
        class="border-l border-dividerLight ml-5"
        :request="request"
        :collection-index="collectionIndex"
        :folder-index="folderIndex"
        :folder-name="folder.name"
        :folder-path="folderPath"
        :request-index="index"
        :doc="doc"
        :picked="picked"
        :save-request="saveRequest"
        :collections-type="collectionsType"
        @edit-request="$emit('edit-request', $event)"
        @select="$emit('select', $event)"
        @remove-request="removeRequest"
      />
      <div
        v-if="
          folder.folders &&
          folder.folders.length === 0 &&
          folder.requests &&
          folder.requests.length === 0
        "
        class="
          border-l border-dividerLight
          flex flex-col
          text-secondaryLight
          ml-5
          p-4
          items-center
          justify-center
        "
      >
        <i class="opacity-75 pb-2 material-icons">folder_open</i>
        <span class="text-center">
          {{ $t("empty.folder") }}
        </span>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('confirm.remove_folder')"
      @hide-modal="confirmRemove = false"
      @resolve="removeFolder"
    />
  </div>
</template>

<script>
import {
  removeRESTFolder,
  removeRESTRequest,
  moveRESTRequest,
} from "~/newstore/collections"

export default {
  name: "Folder",
  props: {
    folder: { type: Object, default: () => {} },
    folderIndex: { type: Number, default: null },
    collectionIndex: { type: Number, default: null },
    folderPath: { type: String, default: null },
    doc: Boolean,
    saveRequest: Boolean,
    isFiltered: Boolean,
    collectionsType: { type: Object, default: () => {} },
    picked: { type: Object, default: () => {} },
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      confirmRemove: false,
      prevCursor: "",
      cursor: "",
    }
  },
  computed: {
    isSelected() {
      return (
        this.picked &&
        this.picked.pickedType === "my-folder" &&
        this.picked.folderPath === this.folderPath
      )
    },
    getCollectionIcon() {
      if (this.isSelected) return "check_circle"
      else if (!this.showChildren && !this.isFiltered) return "arrow_right"
      else if (this.showChildren || this.isFiltered) return "arrow_drop_down"
      else return "folder"
    },
  },
  methods: {
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "my-folder",
            collectionIndex: this.collectionIndex,
            folderName: this.folder.name,
            folderPath: this.folderPath,
          },
        })
      this.showChildren = !this.showChildren
    },
    removeFolder() {
      // TODO: Bubble it up ?
      // Cancel pick if picked folder was deleted
      if (
        this.picked &&
        this.picked.pickedType === "my-folder" &&
        this.picked.folderPath === this.folderPath
      ) {
        this.$emit("select", { picked: null })
      }
      removeRESTFolder(this.folderPath)

      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
    dropEvent({ dataTransfer }) {
      this.dragging = !this.dragging
      const folderPath = dataTransfer.getData("folderPath")
      const requestIndex = dataTransfer.getData("requestIndex")
      moveRESTRequest(folderPath, requestIndex, this.folderPath)
    },
    removeRequest({ requestIndex }) {
      // TODO: Bubble it up to root ?
      // Cancel pick if the picked item is being deleted
      if (
        this.picked &&
        this.picked.pickedType === "my-request" &&
        this.picked.folderPath === this.folderPath &&
        this.picked.requestIndex === requestIndex
      ) {
        this.$emit("select", { picked: null })
      }
      removeRESTRequest(this.folderPath, requestIndex)
    },
  },
}
</script>
