<template>
  <div v-if="collectionsAreReadonly !== undefined" class="flex flex-1 flex-col">
    <div
      class="sticky z-10 flex flex-1 justify-between border-b border-dividerLight bg-primary"
      :style="'top: var(--upper-primary-sticky-fold)'"
    >
      <HoppButtonSecondary
        v-if="collectionsAreReadonly"
        v-tippy="{ theme: 'tooltip' }"
        disabled
        class="!rounded-none"
        :icon="IconPlus"
        :title="t('team.no_access')"
        :label="t('add.new')"
      />
      <HoppButtonSecondary
        v-else
        :icon="IconPlus"
        :label="t('add.new')"
        class="!rounded-none"
        @click="showModalAdd = true"
      />
      <span class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/documentation/features/collections"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconImport"
          :title="t('modal.import_export')"
          @click="onImportExportClick"
        />
      </span>
    </div>
    <div class="flex flex-1 flex-col">
      <HoppSmartTree :adapter="treeAdapter">
        <template
          #content="{ node, toggleChildren, isOpen, highlightChildren }"
        >
          <!-- TODO: Implement -->
          <NewCollectionsRestCollection
            v-if="node.data.type === 'collection'"
            :collection="node.data.value"
            :collection-readonly="collectionsAreReadonly"
            :is-open="isOpen"
            @toggle-children="toggleChildren"
          />
          <div v-else @click="toggleChildren">
            {{ node.data.value }}
          </div>
        </template>
        <template #emptyNode="{ node }">
          <!-- TODO: Implement -->
          <div>Empty Node!</div>
        </template>
      </HoppSmartTree>
    </div>
    <CollectionsAdd
      :show="showModalAdd"
      :loading-state="modalLoadingState"
      @submit="addNewRootCollection"
      @hide-modal="showModalAdd = false"
    />
  </div>
</template>

<script setup lang="ts">
import * as E from "fp-ts/lib/Either"

import { useI18n } from "~/composables/i18n"
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconImport from "~icons/lucide/folder-down"
import { HandleRef } from "~/services/new-workspace/handle"
import { Workspace } from "~/services/new-workspace/workspace"
import { computed, markRaw, ref } from "vue"
import { WorkspaceRESTCollectionTreeAdapter } from "~/helpers/adapters/WorkspaceRESTCollectionTreeAdapter"
import { NewWorkspaceService } from "~/services/new-workspace"
import { useService } from "dioc/vue"

const t = useI18n()

const props = defineProps<{
  workspaceHandle: HandleRef<Workspace>
}>()

const emit = defineEmits<{
  (e: "display-modal-add"): void
  (e: "display-modal-import-export"): void
}>()

const workspaceService = useService(NewWorkspaceService)
const treeAdapter = markRaw(
  new WorkspaceRESTCollectionTreeAdapter(
    props.workspaceHandle,
    workspaceService
  )
)

const collectionsAreReadonly = computed(() => {
  if (props.workspaceHandle.value.type === "ok") {
    return props.workspaceHandle.value.data.collectionsAreReadonly
  }

  return undefined
})

const showModalAdd = ref(false)
const modalLoadingState = ref(false)

async function addNewRootCollection(name: string) {
  modalLoadingState.value = true

  const result = await workspaceService.createRESTRootCollection(
    props.workspaceHandle,
    name
  )

  if (E.isLeft(result)) {
    // TODO: Error Handling
    return
  }

  // Workspace invalidated
  if (result.right.value.type === "invalid") {
    // TODO: Error Handling
    return
  }

  modalLoadingState.value = false
  showModalAdd.value = false
}

function onImportExportClick() {
  // TODO: Implement
}
</script>
