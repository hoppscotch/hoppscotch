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
          font-semibold
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
            $emit('edit-folder', { folder, folderPath })
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
      <CollectionsGraphqlFolder
        v-for="(subFolder, subFolderIndex) in folder.folders"
        :key="`subFolder-${subFolderIndex}`"
        class="ml-5 border-l border-dividerLight"
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
      <CollectionsGraphqlRequest
        v-for="(request, index) in folder.requests"
        :key="`request-${index}`"
        class="ml-5 border-l border-dividerLight"
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
        <span class="text-xs text-center">
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
    getCollectionIcon() {
      if (this.isSelected) return "check_circle"
      else if (!this.showChildren && !this.isFiltered) return "arrow_right"
      else if (this.showChildren || this.isFiltered) return "arrow_drop_down"
      else return "folder"
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
      // Cancel pick if the picked folder is deleted
      if (
        this.picked &&
        this.picked.pickedType === "gql-my-folder" &&
        this.picked.folderPath === this.folderPath
      ) {
        this.$emit("select", { picked: null })
      }

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
