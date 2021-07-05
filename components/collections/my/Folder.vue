<template>
  <div>
    <div
      :class="[{ 'bg-primaryDark': dragging }]"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <div>
        <ButtonSecondary
          :label="folder.name ? folder.name : folder.title"
          @click.native="toggleShowChildren"
        />
        <i v-show="!showChildren && !isFiltered" class="material-icons"
          >arrow_right</i
        >
        <i v-show="showChildren || isFiltered" class="material-icons"
          >arrow_drop_down</i
        >
        <i v-if="isSelected" class="text-green-400 material-icons"
          >check_circle</i
        >
        <i v-else class="material-icons">folder_open</i>
      </div>
      <tippy tabindex="-1" trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('more')"
            icon="more_vert"
          />
        </template>
        <div>
          <ButtonSecondary
            icon="create_new_folder"
            :label="$t('new_folder')"
            @click.native="$emit('add-folder', { folder, path: folderPath })"
          />
        </div>
        <div>
          <ButtonSecondary
            icon="edit"
            :label="$t('edit')"
            @click.native="
              $emit('edit-folder', {
                folder,
                folderIndex,
                collectionIndex,
                folderPath,
              })
            "
          />
        </div>
        <div>
          <ButtonSecondary
            icon="delete"
            :labl="$t('delete')"
            @click.native="confirmRemove = true"
          />
        </div>
      </tippy>
    </div>
    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(subFolder, subFolderIndex) in folder.folders"
          :key="subFolder.name"
          class="ml-8 border-l border-divider"
        >
          <CollectionsMyFolder
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
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in folder.requests"
          :key="index"
          class="flex ml-8 border-l border-divider"
        >
          <CollectionsMyRequest
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
          <p>
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
