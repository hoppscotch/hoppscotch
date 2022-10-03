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
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFilePlus"
          :title="t('request.new')"
          class="hidden group-hover:inline-flex"
          @click="$emit('add-request', { folder, path: folderPath })"
        />
        <ButtonSecondary
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFolderPlus"
          :title="t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click="$emit('add-folder', { folder, path: folderPath })"
        />
        <span>
          <tippy
            v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
            ref="options"
            interactive
            trigger="click"
            theme="popover"
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
                      $emit('add-request', { folder, path: folderPath })
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
                        folderPath: '',
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
                  :loading="exportLoading"
                  @click="exportFolder"
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
          v-for="(subFolder, subFolderIndex) in folder.children"
          :key="`subFolder-${subFolderIndex}`"
          :folder="subFolder"
          :folder-index="subFolderIndex"
          :collection-index="collectionIndex"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :folder-path="`${folderPath}/${subFolderIndex}`"
          :picked="picked"
          :loading-collection-i-ds="loadingCollectionIDs"
          @add-request="$emit('add-request', $event)"
          @add-folder="$emit('add-folder', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @edit-request="$emit('edit-request', $event)"
          @update-team-collections="$emit('update-team-collections')"
          @select="$emit('select', $event)"
          @expand-collection="expandCollection"
          @remove-request="$emit('remove-request', $event)"
          @remove-folder="$emit('remove-folder', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
        />
        <CollectionsTeamsRequest
          v-for="(request, index) in folder.requests"
          :key="`request-${index}`"
          :request="request.request"
          :collection-index="collectionIndex"
          :folder-index="folderIndex"
          :folder-name="folder.name"
          :request-index="request.id"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :picked="picked"
          :collection-i-d="folder.id"
          @edit-request="$emit('edit-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="$emit('remove-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
        />
        <div
          v-if="loadingCollectionIDs.includes(folder.id)"
          class="flex flex-col items-center justify-center p-4"
        >
          <SmartSpinner class="my-4" />
          <span class="text-secondaryLight">{{ t("state.loading") }}</span>
        </div>
        <div
          v-else-if="
            (folder.children == undefined || folder.children.length === 0) &&
            (folder.requests == undefined || folder.requests.length === 0)
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
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconEdit from "~icons/lucide/edit"
import IconDownload from "~icons/lucide/download"
import IconTrash2 from "~icons/lucide/trash-2"
import IconFilePlus from "~icons/lucide/file-plus"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import { defineComponent, ref } from "vue"
import * as E from "fp-ts/Either"
import {
  getCompleteCollectionTree,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import { moveRESTTeamRequest } from "~/helpers/backend/mutations/TeamRequest"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useColorMode } from "@composables/theming"

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
    loadingCollectionIDs: { type: Array, default: () => [] },
  },
  emits: [
    "add-request",
    "add-folder",
    "edit-folder",
    "update-team-collections",
    "edit-request",
    "remove-request",
    "duplicate-request",
    "select",
    "remove-folder",
    "expand-collection",
  ],
  setup() {
    return {
      // Template refs
      tippyActions: ref<any | null>(null),
      options: ref<any | null>(null),
      requestAction: ref<any | null>(null),
      folderAction: ref<any | null>(null),
      edit: ref<any | null>(null),
      deleteAction: ref<any | null>(null),
      exportAction: ref<any | null>(null),
      exportLoading: ref<boolean>(false),
      toast: useToast(),
      t: useI18n(),
      colorMode: useColorMode(),
      IconFilePlus,
      IconFolderPlus,
      IconCheckCircle,
      IconFolder,
      IconFolderOpen,
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
        this.picked.pickedType === "teams-folder" &&
        this.picked.folderID === this.folder.id
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
    async exportFolder() {
      this.exportLoading = true

      const result = await getCompleteCollectionTree(this.folder.id)()

      if (E.isLeft(result)) {
        this.toast.error(this.t("error.something_went_wrong").toString())
        console.log(result.left)
        this.exportLoading = false
        this.options.tippy().hide()

        return
      }

      const hoppColl = teamCollToHoppRESTColl(result.right)

      const collectionJSON = JSON.stringify(hoppColl)

      const file = new Blob([collectionJSON], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url

      a.download = `${hoppColl.name}.json`
      document.body.appendChild(a)
      a.click()
      this.toast.success(this.t("state.download_started").toString())

      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 1000)

      this.exportLoading = false

      this.options.tippy().hide()
    },
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-folder",
            folderID: this.folder.id,
          },
        })

      this.$emit("expand-collection", this.$props.folder.id)
      this.showChildren = !this.showChildren
    },
    removeFolder() {
      this.$emit("remove-folder", {
        collectionsType: this.collectionsType,
        folder: this.folder,
      })
    },
    expandCollection(collectionID: number) {
      this.$emit("expand-collection", collectionID)
    },
    async dropEvent({ dataTransfer }: any) {
      this.dragging = !this.dragging
      const requestIndex = dataTransfer.getData("requestIndex")
      const moveRequestResult = await moveRESTTeamRequest(
        requestIndex,
        this.folder.id
      )()
      if (E.isLeft(moveRequestResult))
        this.toast.error(`${this.t("error.something_went_wrong")}`)
    },
  },
})
</script>
