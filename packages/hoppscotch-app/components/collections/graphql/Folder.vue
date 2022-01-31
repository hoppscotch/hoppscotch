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
      @contextmenu.prevent="options.tippy().show()"
    >
      <span
        class="flex items-center justify-center px-4 cursor-pointer"
        @click="toggleShowChildren()"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
          :name="getCollectionIcon"
        />
      </span>
      <span
        class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
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
            :on-shown="() => tippyActions.focus()"
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
              @keyup.n="folderAction.$el.click()"
              @keyup.e="edit.$el.click()"
              @keyup.delete="deleteAction.$el.click()"
              @keyup.escape="options.tippy().hide()"
            >
              <SmartItem
                ref="folderAction"
                svg="folder-plus"
                :label="`${$t('folder.new')}`"
                :shortcut="['N']"
                @click.native="
                  () => {
                    $emit('add-folder', { folder, path: folderPath })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="edit"
                svg="edit"
                :label="`${$t('action.edit')}`"
                :shortcut="['E']"
                @click.native="
                  () => {
                    $emit('edit-folder', { folder, folderPath })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="deleteAction"
                svg="trash-2"
                :label="`${$t('action.delete')}`"
                :shortcut="['⌫']"
                @click.native="
                  () => {
                    confirmRemove = true
                    options.tippy().hide()
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
        <CollectionsGraphqlFolder
          v-for="(subFolder, subFolderIndex) in folder.folders"
          :key="`subFolder-${String(subFolderIndex)}`"
          :picked="picked"
          :saving-mode="savingMode"
          :folder="subFolder"
          :folder-index="subFolderIndex"
          :folder-path="`${folderPath}/${String(subFolderIndex)}`"
          :collection-index="collectionIndex"
          :doc="doc"
          :is-filtered="isFiltered"
          @add-folder="$emit('add-folder', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
        />
        <CollectionsGraphqlRequest
          v-for="(request, index) in folder.requests"
          :key="`request-${String(index)}`"
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
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
        />
        <div
          v-if="
            folder.folders &&
            folder.folders.length === 0 &&
            folder.requests &&
            folder.requests.length === 0
          "
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <img
            :src="`/images/states/${$colorMode.value}/pack.svg`"
            loading="lazy"
            class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
            :alt="`${$t('empty.folder')}`"
          />
          <span class="text-center">
            {{ $t("empty.folder") }}
          </span>
        </div>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="`${$t('confirm.remove_folder')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeFolder"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "@nuxtjs/composition-api"
import { removeGraphqlFolder, moveGraphqlRequest } from "~/newstore/collections"

export default defineComponent({
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
  setup() {
    return {
      tippyActions: ref<any | null>(null),
      options: ref<any | null>(null),
      folderAction: ref<any | null>(null),
      edit: ref<any | null>(null),
      deleteAction: ref<any | null>(null),
    }
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
      if (this.isSelected) return "check-circle"
      else if (!this.showChildren && !this.isFiltered) return "folder"
      else if (this.showChildren || this.isFiltered) return "folder-open"
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
      this.$toast.success(`${this.$t("state.deleted")}`)
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
