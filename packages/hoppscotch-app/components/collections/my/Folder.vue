<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-stretch group"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
      @contextmenu.prevent="$refs.options.tippy().show()"
    >
      <span
        class="cursor-pointer flex px-4 items-center justify-center"
        @click="toggleShowChildren()"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
          :name="getCollectionIcon"
        />
      </span>
      <span
        class="cursor-pointer flex flex-1 min-w-0 py-2 pr-2 transition group-hover:text-secondaryDark"
        @click="toggleShowChildren()"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ folder.name ? folder.name : folder.title }}
        </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          svg="folder-plus"
          :title="$t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click.native="$emit('add-folder', { folder, path: folderPath })"
        />
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            arrow
            :on-shown="() => $refs.tippyActions.focus()"
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.n="$refs.folder.$el.click()"
              @keyup.e="$refs.edit.$el.click()"
              @keyup.delete="$refs.delete.$el.click()"
            >
              <SmartItem
                ref="folder"
                svg="folder-plus"
                :label="$t('folder.new')"
                :shortcut="['N']"
                @click.native="
                  () => {
                    $emit('add-folder', { folder, path: folderPath })
                    $refs.options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="edit"
                svg="edit"
                :label="$t('action.edit')"
                :shortcut="['E']"
                @click.native="
                  () => {
                    $emit('edit-folder', {
                      folder,
                      folderIndex,
                      collectionIndex,
                      folderPath,
                    })
                    $refs.options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="delete"
                svg="trash-2"
                :label="$t('action.delete')"
                :shortcut="['⌫']"
                @click.native="
                  () => {
                    confirmRemove = true
                    $refs.options.tippy().hide()
                  }
                "
              />
            </div>
          </tippy>
        </span>
      </div>
    </div>
    <div v-if="showChildren || isFiltered" class="flex">
      <div
        class="bg-dividerLight cursor-nsResize flex ml-5.5 transform transition w-1 hover:bg-dividerDark hover:scale-x-125"
        @click="toggleShowChildren()"
      ></div>
      <div class="flex flex-col flex-1 truncate">
        <CollectionsMyFolder
          v-for="(subFolder, subFolderIndex) in folder.folders"
          :key="`subFolder-${subFolderIndex}`"
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
          @duplicate-request="$emit('duplicate-request', $event)"
          @update-team-collections="$emit('update-team-collections')"
          @select="$emit('select', $event)"
          @remove-request="removeRequest"
        />
        <CollectionsMyRequest
          v-for="(request, index) in folder.requests"
          :key="`request-${index}`"
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
          @duplicate-request="$emit('duplicate-request', $event)"
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
          class="flex flex-col text-secondaryLight p-4 items-center justify-center"
        >
          <img
            :src="`/images/states/${$colorMode.value}/pack.svg`"
            loading="lazy"
            class="flex-col object-contain object-center h-16 mb-4 w-16 inline-flex"
            :alt="$t('empty.folder')"
          />
          <span class="text-center">
            {{ $t("empty.folder") }}
          </span>
        </div>
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
import { defineComponent } from "@nuxtjs/composition-api"
import {
  removeRESTFolder,
  removeRESTRequest,
  moveRESTRequest,
} from "~/newstore/collections"

export default defineComponent({
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
      if (this.isSelected) return "check-circle"
      else if (!this.showChildren && !this.isFiltered) return "folder"
      else if (this.showChildren || this.isFiltered) return "folder-open"
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
      this.$toast.success(this.$t("state.deleted"))
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
})
</script>
