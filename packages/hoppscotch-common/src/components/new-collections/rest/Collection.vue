<template>
  <div class="flex flex-col">
    <div class="relative flex flex-col">
      <div
        class="z-3 group pointer-events-auto relative flex cursor-pointer items-stretch"
        @contextmenu.prevent="options?.tippy.show()"
      >
        <div
          class="flex min-w-0 flex-1 items-center justify-center"
          @click="emit('toggle-children')"
        >
          <span
            class="pointer-events-none flex items-center justify-center px-4"
          >
            <component :is="collectionIcon" class="svg-icons" />
          </span>
          <span
            class="pointer-events-none flex min-w-0 flex-1 py-2 pr-2 transition group-hover:text-secondaryDark"
          >
            <span class="truncate">
              {{ collectionView.name }}
            </span>
          </span>
        </div>
        <div class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFilePlus"
            :title="t('request.new')"
            class="hidden group-hover:inline-flex"
            @click="addRequest"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFolderPlus"
            :title="t('folder.new')"
            class="hidden group-hover:inline-flex"
            @click="addChildCollection"
          />
          <span>
            <tippy
              ref="options"
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions!.focus()"
            >
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.more')"
                :icon="IconMoreVertical"
              />
              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.r="requestAction?.$el.click()"
                  @keyup.n="folderAction?.$el.click()"
                  @keyup.e="edit?.$el.click()"
                  @keyup.delete="deleteAction?.$el.click()"
                  @keyup.x="exportAction?.$el.click()"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    ref="requestAction"
                    :icon="IconFilePlus"
                    :label="t('request.new')"
                    :shortcut="['R']"
                    @click="
                      () => {
                        addRequest()
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="folderAction"
                    :icon="IconFolderPlus"
                    :label="t('folder.new')"
                    :shortcut="['N']"
                    @click="
                      () => {
                        addChildCollection()
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="edit"
                    :icon="IconEdit"
                    :label="t('action.edit')"
                    :shortcut="['E']"
                    @click="
                      () => {
                        editCollection()
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="exportAction"
                    :icon="IconDownload"
                    :label="t('export.title')"
                    :shortcut="['X']"
                    @click="
                      () => {
                        emit('export-data'), hide()
                      }
                    "
                  />
                  <HoppSmartItem
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
                  <HoppSmartItem
                    ref="propertiesAction"
                    :icon="IconSettings2"
                    :label="t('action.properties')"
                    :shortcut="['P']"
                    @click="
                      () => {
                        emit(
                          'edit-collection-properties',
                          collectionView.collectionID
                        )
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { RESTCollectionViewCollection } from "~/services/new-workspace/view"
import { TippyComponent } from "vue-tippy"
import { ref, computed } from "vue"
import { useI18n } from "~/composables/i18n"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconFilePlus from "~icons/lucide/file-plus"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconDownload from "~icons/lucide/download"
import IconTrash2 from "~icons/lucide/trash-2"
import IconEdit from "~icons/lucide/edit"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import IconSettings2 from "~icons/lucide/settings-2"

const t = useI18n()

const props = defineProps<{
  collectionView: RESTCollectionViewCollection
  isOpen: boolean
}>()

const emit = defineEmits<{
  (event: "toggle-children"): void
  (event: "add-request", parentCollectionIndexPath: string): void
  (event: "add-child-collection", parentCollectionIndexPath: string): void
  (
    event: "edit-root-collection",
    payload: { collectionIndexPath: string; collectionName: string }
  ): void
  (
    event: "edit-child-collection",
    payload: { collectionIndexPath: string; collectionName: string }
  ): void
  (event: "edit-collection-properties", collectionIndexPath: string): void
  (event: "export-data"): void
  (event: "remove-root-collection", collectionIndexPath: string): void
  (event: "remove-child-collection", collectionIndexPath: string): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const requestAction = ref<HTMLButtonElement | null>(null)
const folderAction = ref<HTMLButtonElement | null>(null)
const edit = ref<HTMLButtonElement | null>(null)
const deleteAction = ref<HTMLButtonElement | null>(null)
const exportAction = ref<HTMLButtonElement | null>(null)
const options = ref<TippyComponent | null>(null)

const collectionIcon = computed(() => {
  return !props.isOpen ? IconFolder : IconFolderOpen
})

const addChildCollection = () => {
  emit("add-child-collection", props.collectionView.collectionID)
}

const addRequest = () => {
  emit("add-request", props.collectionView.collectionID)
}

const editCollection = () => {
  const { collectionID: collectionIndexPath, name: collectionName } =
    props.collectionView

  const data = {
    collectionIndexPath,
    collectionName,
  }

  collectionIndexPath.split("/").length > 1
    ? emit("edit-child-collection", data)
    : emit("edit-root-collection", data)
}

const removeCollection = () => {
  const { collectionID } = props.collectionView

  collectionID.split("/").length > 1
    ? emit("remove-child-collection", collectionID)
    : emit("remove-root-collection", collectionID)
}
</script>
