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
      @contextmenu.prevent="options.tippy.show()"
    >
      <span
        class="flex items-center justify-center px-4 cursor-pointer"
        @click="toggleShowChildren()"
      >
        <component
          :is="getCollectionIcon"
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
        />
      </span>
      <span
        class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        @click="toggleShowChildren()"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ collection.name }}
        </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFilePlus"
          :title="t('request.new')"
          class="hidden group-hover:inline-flex"
          @click="
            $emit('add-request', {
              path: `${collectionIndex}`,
            })
          "
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFolderPlus"
          :title="t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click="
            $emit('add-folder', {
              folder: collection,
              path: `${collectionIndex}`,
            })
          "
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
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.more')"
              :icon="IconMoreVertical"
            />
            <template #content="{ hide }">
              <div
                ref="tippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                role="menu"
                @keyup.r="requestAction.$el.click()"
                @keyup.n="folderAction.$el.click()"
                @keyup.e="edit.$el.click()"
                @keyup.delete="deleteAction.$el.click()"
                @keyup.x="exportAction.$el.click()"
                @keyup.escape="options.tippy().hide()"
              >
                <SmartItem
                  ref="requestAction"
                  :icon="IconFilePlus"
                  :label="t('request.new')"
                  :shortcut="['R']"
                  @click="
                    () => {
                      $emit('add-request', {
                        path: `${collectionIndex}`,
                      })
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="folderAction"
                  :icon="IconFolderPlus"
                  :label="t('folder.new')"
                  :shortcut="['N']"
                  @click="
                    () => {
                      $emit('add-folder', {
                        folder: collection,
                        path: `${collectionIndex}`,
                      })
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="edit"
                  :icon="IconEdit"
                  :label="t('action.edit')"
                  :shortcut="['E']"
                  @click="
                    () => {
                      $emit('edit-collection')
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="exportAction"
                  :icon="IconDownload"
                  :label="t('export.title')"
                  :shortcut="['X']"
                  @click="
                    () => {
                      exportCollection()
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="deleteAction"
                  :icon="IconTrash2"
                  :label="t('action.delete')"
                  :shortcut="['⌫']"
                  @click="
                    () => {
                      removeCollection()
                      hide()
                    }
                  "
                />
              </div>
            </template>
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
          v-for="(folder, index) in collection.folders"
          :key="`folder-${index}`"
          :folder="folder"
          :folder-index="index"
          :folder-path="`${collectionIndex}/${index}`"
          :collection-index="collectionIndex"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :is-filtered="isFiltered"
          :picked="picked"
          @add-request="$emit('add-request', $event)"
          @add-folder="$emit('add-folder', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="$emit('remove-request', $event)"
          @remove-folder="$emit('remove-folder', $event)"
        />
        <CollectionsMyRequest
          v-for="(request, index) in collection.requests"
          :key="`request-${index}`"
          :request="request"
          :collection-index="collectionIndex"
          :folder-index="-1"
          :folder-name="collection.name"
          :folder-path="`${collectionIndex}`"
          :request-index="index"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :picked="picked"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="$emit('remove-request', $event)"
        />
        <div
          v-if="
            (collection.folders == undefined ||
              collection.folders.length === 0) &&
            (collection.requests == undefined ||
              collection.requests.length === 0)
          "
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <img
            :src="`/images/states/${colorMode.value}/pack.svg`"
            loading="lazy"
            class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
            :alt="`${t('empty.collection')}`"
          />
          <span class="text-center">
            {{ t("empty.collection") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import IconCircle from "~icons/lucide/circle"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconFilePlus from "~icons/lucide/file-plus"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconDownload from "~icons/lucide/download"
import IconTrash2 from "~icons/lucide/trash-2"
import IconEdit from "~icons/lucide/edit"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import { useColorMode } from "@composables/theming"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { defineComponent, ref, markRaw } from "vue"
import { moveRESTRequest } from "~/newstore/collections"

export default defineComponent({
  props: {
    collectionIndex: { type: Number, default: null },
    collection: { type: Object, default: () => ({}) },
    isFiltered: Boolean,
    saveRequest: Boolean,
    collectionsType: { type: Object, default: () => ({}) },
    picked: { type: Object, default: () => ({}) },
  },
  emits: [
    "select",
    "expand-collection",
    "add-collection",
    "remove-collection",
    "add-folder",
    "add-request",
    "edit-folder",
    "edit-request",
    "duplicate-request",
    "remove-folder",
    "remove-request",
    "select-collection",
    "unselect-collection",
    "edit-collection",
  ],
  setup() {
    return {
      colorMode: useColorMode(),
      toast: useToast(),
      t: useI18n(),

      tippyActions: ref<any | null>(null),
      options: ref<any | null>(null),
      requestAction: ref<any | null>(null),
      folderAction: ref<any | null>(null),
      edit: ref<any | null>(null),
      deleteAction: ref<any | null>(null),
      exportAction: ref<any | null>(null),
    }
  },
  data() {
    return {
      IconCircle: markRaw(IconCircle),
      IconCheckCircle: markRaw(IconCheckCircle),
      IconFilePlus: markRaw(IconFilePlus),
      IconFolderPlus: markRaw(IconFolderPlus),
      IconMoreVertical: markRaw(IconMoreVertical),
      IconEdit: markRaw(IconEdit),
      IconDownload: markRaw(IconDownload),
      IconTrash2: markRaw(IconTrash2),

      showChildren: false,
      dragging: false,
      selectedFolder: {},
      prevCursor: "",
      cursor: "",
      pageNo: 0,
    }
  },
  computed: {
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "my-collection" &&
        this.picked.collectionIndex === this.collectionIndex
      )
    },
    getCollectionIcon() {
      if (this.isSelected) return IconCheckCircle
      else if (!this.showChildren && !this.isFiltered) return IconFolder
      else if (this.showChildren || this.isFiltered) return IconFolderOpen
      else return IconFolder
    },
  },
  methods: {
    exportCollection() {
      const collectionJSON = JSON.stringify(this.collection)

      const file = new Blob([collectionJSON], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url

      a.download = `${this.collection.name}.json`
      document.body.appendChild(a)
      a.click()
      this.toast.success(this.t("state.download_started").toString())
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 1000)
    },
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "my-collection",
            collectionIndex: this.collectionIndex,
          },
        })

      this.$emit("expand-collection", this.collection.id)
      this.showChildren = !this.showChildren
    },
    removeCollection() {
      this.$emit("remove-collection", {
        collectionIndex: this.collectionIndex,
        collectionID: this.collection.id,
      })
    },
    dropEvent({ dataTransfer }: any) {
      this.dragging = !this.dragging
      const folderPath = dataTransfer.getData("folderPath")
      const requestIndex = dataTransfer.getData("requestIndex")
      moveRESTRequest(folderPath, requestIndex, `${this.collectionIndex}`)
    },
  },
})
</script>
