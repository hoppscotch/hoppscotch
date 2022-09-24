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
          :is="collectionIcon"
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
          @click="emit('add-request', { path: folderPath })"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFolderPlus"
          :title="t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click="emit('add-folder', { folder, path: folderPath })"
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
                @keyup.escape="hide()"
              >
                <SmartItem
                  ref="requestAction"
                  :icon="IconFilePlus"
                  :label="`${t('request.new')}`"
                  :shortcut="['R']"
                  @click="
                    () => {
                      emit('add-request', { path: folderPath })
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="folderAction"
                  :icon="IconFolderPlus"
                  :label="`${t('folder.new')}`"
                  :shortcut="['N']"
                  @click="
                    () => {
                      emit('add-folder', { folder, path: folderPath })
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="edit"
                  :icon="IconEdit"
                  :label="`${t('action.edit')}`"
                  :shortcut="['E']"
                  @click="
                    () => {
                      emit('edit-folder', { folder, folderPath })
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="deleteAction"
                  :icon="IconTrash2"
                  :label="`${t('action.delete')}`"
                  :shortcut="['⌫']"
                  @click="
                    () => {
                      confirmRemove = true
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
          :key="`subFolder-${String(subFolderIndex)}`"
          :picked="picked"
          :saving-mode="savingMode"
          :folder="subFolder"
          :folder-index="subFolderIndex"
          :folder-path="`${folderPath}/${String(subFolderIndex)}`"
          :collection-index="collectionIndex"
          :is-filtered="isFiltered"
          @add-request="emit('add-request', $event)"
          @add-folder="emit('add-folder', $event)"
          @edit-folder="emit('edit-folder', $event)"
          @edit-request="emit('edit-request', $event)"
          @duplicate-request="emit('duplicate-request', $event)"
          @select="emit('select', $event)"
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
          @edit-request="emit('edit-request', $event)"
          @duplicate-request="emit('duplicate-request', $event)"
          @select="emit('select', $event)"
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
    <SmartConfirmModal
      :show="confirmRemove"
      :title="`${t('confirm.remove_folder')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeFolder"
    />
  </div>
</template>

<script setup lang="ts">
import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconFilePlus from "~icons/lucide/file-plus"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { removeGraphqlFolder, moveGraphqlRequest } from "~/newstore/collections"
import { computed, ref } from "vue"

const toast = useToast()
const t = useI18n()
const colorMode = useColorMode()

const props = defineProps({
  picked: { type: Object, default: null },
  // Whether the request is in a selectable mode (activates 'select' event)
  savingMode: { type: Boolean, default: false },
  folder: { type: Object, default: () => ({}) },
  folderIndex: { type: Number, default: null },
  collectionIndex: { type: Number, default: null },
  folderPath: { type: String, default: null },
  isFiltered: Boolean,
})

const emit = defineEmits([
  "select",
  "add-request",
  "edit-request",
  "add-folder",
  "edit-folder",
  "duplicate-request",
])

const tippyActions = ref<any | null>(null)
const options = ref<any | null>(null)
const requestAction = ref<any | null>(null)
const folderAction = ref<any | null>(null)
const edit = ref<any | null>(null)
const deleteAction = ref<any | null>(null)

const showChildren = ref(false)
const dragging = ref(false)
const confirmRemove = ref(false)

const isSelected = computed(
  () =>
    props.picked?.pickedType === "gql-my-folder" &&
    props.picked?.folderPath === props.folderPath
)
const collectionIcon = computed(() => {
  if (isSelected.value) return IconCheckCircle
  else if (!showChildren.value && !props.isFiltered) return IconFolder
  else if (showChildren.value || !props.isFiltered) return IconFolderOpen
  else return IconFolder
})

const pick = () => {
  emit("select", {
    picked: {
      pickedType: "gql-my-folder",
      folderPath: props.folderPath,
    },
  })
}

const toggleShowChildren = () => {
  if (props.savingMode) {
    pick()
  }

  showChildren.value = !showChildren.value
}

const removeFolder = () => {
  // Cancel pick if the picked folder is deleted
  if (
    props.picked?.pickedType === "gql-my-folder" &&
    props.picked?.folderPath === props.folderPath
  ) {
    emit("select", { picked: null })
  }

  removeGraphqlFolder(props.folderPath)
  toast.success(t("state.deleted"))
}

const dropEvent = ({ dataTransfer }: any) => {
  dragging.value = !dragging.value
  const folderPath = dataTransfer.getData("folderPath")
  const requestIndex = dataTransfer.getData("requestIndex")
  moveGraphqlRequest(folderPath, requestIndex, props.folderPath)
}
</script>
