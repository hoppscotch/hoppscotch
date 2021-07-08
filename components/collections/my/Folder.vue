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
        class="
          flex
          justify-center
          items-center
          text-xs
          w-10
          truncate
          cursor-pointer
        "
        @click="toggleShowChildren()"
      >
        <i class="material-icons" :class="{ 'text-green-400': isSelected }">
          {{ getCollectionIcon }}
        </i>
      </span>
      <span
        class="
          py-3
          cursor-pointer
          pr-2
          flex flex-1
          min-w-0
          text-xs
          group-hover:text-secondaryDark
          transition
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
        :title="$t('new_folder')"
        class="group-hover:inline-flex hidden"
        @click.native="$emit('add-folder', { folder, path: folderPath })"
      />
      <tippy
        ref="options"
        interactive
        tabindex="-1"
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('more')"
            icon="more_vert"
          />
        </template>
        <SmartItem
          icon="create_new_folder"
          :label="$t('new_folder')"
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
          :label="$t('delete')"
          @click.native="
            confirmRemove = true
            $refs.options.tippy().hide()
          "
        />
      </tippy>
    </div>
    <div v-show="showChildren || isFiltered">
      <CollectionsMyFolder
        v-for="(subFolder, subFolderIndex) in folder.folders"
        :key="subFolder.name"
        class="ml-5 border-l border-dividerLight"
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
        :key="index"
        class="ml-5 border-l border-dividerLight"
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
          flex
          items-center
          text-secondaryLight
          flex-col
          p-4
          justify-center
          ml-5
          border-l border-dividerLight
        "
      >
        <i class="material-icons opacity-50 pb-2">folder_open</i>
        <span class="text-xs">
          {{ $t("folder_empty") }}
        </span>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_folder')"
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
