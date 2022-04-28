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
          svg="file-plus"
          :title="$t('request.new')"
          class="hidden group-hover:inline-flex"
          @click.native="$emit('add-request', { path: folderPath })"
        />
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
              role="menu"
              @keyup.r="requestAction.$el.click()"
              @keyup.n="folderAction.$el.click()"
              @keyup.e="edit.$el.click()"
              @keyup.delete="deleteAction.$el.click()"
              @keyup.escape="options.tippy().hide()"
            >
              <SmartItem
                ref="requestAction"
                svg="file-plus"
                :label="`${$t('request.new')}`"
                :shortcut="['R']"
                @click.native="
                  () => {
                    $emit('add-request', { path: folderPath })
                    options.tippy().hide()
                  }
                "
              />
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
          @add-request="$emit('add-request', $event)"
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

<script setup lang="ts">
import { HoppCollection, HoppGQLRequest } from "@hoppscotch/data"
import { ref, computed } from "@nuxtjs/composition-api"
import { removeGraphqlFolder, moveGraphqlRequest } from "~/newstore/collections"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

type PickedType = {
  pickedType: "gql-my-folder"
  folderPath: string
} | null

const props = defineProps<{
  picked: PickedType
  folder: HoppCollection<HoppGQLRequest>
  folderIndex: number
  collectionIndex: number
  folderPath: string
  doc: boolean
  isFiltered: boolean
  // Whether the request is in a selectable mode (activates 'select' event)
  savingMode: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "select", v: { picked: PickedType }): void
}>()

const tippyActions = ref<unknown | null>(null)
const options = ref<unknown | null>(null)
const requestAction = ref<unknown | null>(null)
const folderAction = ref<unknown | null>(null)
const edit = ref<unknown | null>(null)
const deleteAction = ref<unknown | null>(null)

const showChildren = ref(false)
const dragging = ref(false)
const confirmRemove = ref(false)

const isSelected = computed(
  () =>
    !!props.picked &&
    props.picked.pickedType === "gql-my-folder" &&
    props.picked.folderPath === props.folderPath
)

const getCollectionIcon = computed(() => {
  if (isSelected.value) return "check-circle"
  else if (!showChildren.value && !props.isFiltered) return "folder"
  else if (showChildren.value || props.isFiltered) return "folder-open"
  else return "folder"
})

const select = (picked: PickedType) => {
  emit("select", { picked })
}

const toggleShowChildren = () => {
  if (props.savingMode)
    select({
      pickedType: "gql-my-folder",
      folderPath: props.folderPath,
    })

  showChildren.value = !showChildren.value
}

const removeFolder = () => {
  // Cancel pick if the picked folder is deleted
  if (isSelected.value) select(null)

  removeGraphqlFolder(props.folderPath)
  toast.success(`${t("state.deleted")}`)
}

const dropEvent = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    dragging.value = !dragging.value
    const folderPath = dataTransfer.getData("folderPath")
    const requestIndex = dataTransfer.getData("requestIndex")
    moveGraphqlRequest(folderPath, Number(requestIndex), props.folderPath)
  }
}
</script>
