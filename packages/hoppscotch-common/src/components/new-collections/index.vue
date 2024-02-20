<template>
  <div v-if="!activeWorkspaceHandle">No Workspace Selected.</div>
  <div
    v-else
    :class="{
      'rounded border border-divider': saveRequest,
      'bg-primaryDark':
        draggingToRoot && currentReorderingStatus.type !== 'request',
    }"
    class="flex-1"
    @drop.prevent="dropToRoot"
    @dragover.prevent="draggingToRoot = true"
    @dragend="draggingToRoot = false"
  >
    <div
      class="sticky z-10 flex flex-shrink-0 flex-col overflow-x-auto border-b border-dividerLight bg-primary"
      :style="{
        top: 0,
      }"
    >
      <WorkspaceCurrent :section="t('tab.collections')" />
      <input
        v-model="searchText"
        type="search"
        autocomplete="off"
        class="flex h-8 w-full bg-transparent p-4 py-2"
        :placeholder="t('action.search')"
      />
    </div>
    <NewCollectionsRest
      v-if="platform === 'rest'"
      :picked="picked"
      :save-request="saveRequest"
      :workspace-handle="activeWorkspaceHandle"
      @select="(payload) => emit('select', payload)"
    />
  </div>
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"
import { ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { useToast } from "~/composables/toast"
import { Picked } from "~/helpers/types/HoppPicked"
import toast from "~/modules/toast"
import { moveRESTFolder } from "~/newstore/collections"
import { currentReorderingStatus$ } from "~/newstore/reordering"
import { NewWorkspaceService } from "~/services/new-workspace"

defineProps<{
  picked?: Picked | null
  platform: "rest" | "gql"
  saveRequest?: boolean
}>()

const emit = defineEmits<{
  (event: "select", payload: Picked | null): void
}>()

const t = useI18n()
const toast = useToast()

const draggingToRoot = ref(false)
const searchText = ref("")

const workspaceService = useService(NewWorkspaceService)

const activeWorkspaceHandle = workspaceService.activeWorkspaceHandle

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

/**
 * This function is called when the user drops the collection
 * to the root
 * @param payload - object containing the collection index dragged
 */
const dropToRoot = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    const collectionIndexDragged = dataTransfer.getData("collectionIndex")
    if (!collectionIndexDragged) return
    // check if the collection is already in the root
    if (isAlreadyInRoot(collectionIndexDragged)) {
      toast.error(`${t("collection.invalid_root_move")}`)
    } else {
      moveRESTFolder(collectionIndexDragged, null)
      toast.success(`${t("collection.moved")}`)
    }

    draggingToRoot.value = false
  }
}

/**
 * Checks if the collection is already in the root
 * @param id - path of the collection
 * @returns boolean - true if the collection is already in the root
 */
const isAlreadyInRoot = (id: string) => {
  const indexPath = id.split("/")
  return indexPath.length === 1
}
</script>
