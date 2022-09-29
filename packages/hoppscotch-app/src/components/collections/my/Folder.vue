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
          {{ folder.name ? folder.name : folder.title }}
        </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFilePlus"
          :title="t('request.new')"
          class="hidden group-hover:inline-flex"
          @click="$emit('add-request', { path: folderPath })"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFolderPlus"
          :title="t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click="$emit('add-folder', { folder, path: folderPath })"
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
                @keyup.escape="hide()"
              >
                <SmartItem
                  ref="requestAction"
                  :icon="IconFilePlus"
                  :label="t('request.new')"
                  :shortcut="['R']"
                  @click="
                    () => {
                      $emit('add-request', { path: folderPath })
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
                      $emit('add-folder', { folder, path: folderPath })
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
                      $emit('edit-folder', {
                        folder,
                        folderIndex,
                        collectionIndex,
                        folderPath,
                      })
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
                      exportFolder()
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
                      removeFolder()
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
        <!-- Referring to this component only (this is recursive) -->
        <Folder
          v-for="(subFolder, subFolderIndex) in folder.folders"
          :key="`subFolder-${subFolderIndex}`"
          :folder="subFolder"
          :folder-index="subFolderIndex"
          :collection-index="collectionIndex"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :folder-path="`${folderPath}/${subFolderIndex}`"
          :picked="picked"
          @add-request="$emit('add-request', $event)"
          @add-folder="$emit('add-folder', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @update-team-collections="$emit('update-team-collections')"
          @select="$emit('select', $event)"
          @remove-request="$emit('remove-request', $event)"
          @remove-folder="$emit('remove-folder', $event)"
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
          :picked="picked"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="$emit('remove-request', $event)"
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
            :src="`/images/states/${colorMode.value}/pack.svg`"
            loading="lazy"
            class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
            :alt="`${t('empty.folder')}`"
          />
          <span class="text-center">
            {{ t("empty.folder") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import IconFilePlus from "~icons/lucide/file-plus"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconEdit from "~icons/lucide/edit"
import IconDownload from "~icons/lucide/download"
import IconTrash2 from "~icons/lucide/trash-2"
import IconFolder from "~icons/lucide/folder"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFolderOpen from "~icons/lucide/folder-open"
import { defineComponent, ref } from "vue"
import { useColorMode } from "@composables/theming"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { moveRESTRequest } from "~/newstore/collections"

export default defineComponent({
  name: "Folder",
  props: {
    folder: { type: Object, default: () => ({}) },
    folderIndex: { type: Number, default: null },
    collectionIndex: { type: Number, default: null },
    folderPath: { type: String, default: null },
    saveRequest: Boolean,
    isFiltered: Boolean,
    collectionsType: { type: Object, default: () => ({}) },
    picked: { type: Object, default: () => ({}) },
  },
  emits: [
    "add-request",
    "add-folder",
    "edit-folder",
    "update-team",
    "remove-folder",
    "edit-request",
    "duplicate-request",
    "select",
    "remove-request",
    "update-team-collections",
  ],
  setup() {
    const t = useI18n()

    return {
      tippyActions: ref<any | null>(null),
      options: ref<any | null>(null),
      requestAction: ref<any | null>(null),
      folderAction: ref<any | null>(null),
      edit: ref<any | null>(null),
      deleteAction: ref<any | null>(null),
      exportAction: ref<any | null>(null),
      t,
      toast: useToast(),
      colorMode: useColorMode(),
      IconFilePlus,
      IconFolderPlus,
      IconMoreVertical,
      IconEdit,
      IconDownload,
      IconTrash2,
    }
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      prevCursor: "",
      cursor: "",
    }
  },
  computed: {
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "my-folder" &&
        this.picked.folderPath === this.folderPath
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
    exportFolder() {
      const folderJSON = JSON.stringify(this.folder)

      const file = new Blob([folderJSON], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url

      a.download = `${this.folder.name}.json`
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
            pickedType: "my-folder",
            collectionIndex: this.collectionIndex,
            folderName: this.folder.name,
            folderPath: this.folderPath,
          },
        })
      this.showChildren = !this.showChildren
    },
    removeFolder() {
      this.$emit("remove-folder", {
        folder: this.folder,
        folderPath: this.folderPath,
      })
    },
    dropEvent({ dataTransfer }) {
      this.dragging = !this.dragging
      const folderPath = dataTransfer.getData("folderPath")
      const requestIndex = dataTransfer.getData("requestIndex")
      moveRESTRequest(folderPath, requestIndex, this.folderPath)
    },
  },
})
</script>
