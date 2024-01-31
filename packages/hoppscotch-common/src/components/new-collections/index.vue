<template>
  <div v-if="!activeWorkspaceHandle">No Workspace Selected.</div>
  <div v-else class="flex-1">
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
      :workspace-handle="activeWorkspaceHandle"
    />
  </div>
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"
import { ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { NewWorkspaceService } from "~/services/new-workspace"

defineProps<{
  platform: "rest" | "gql"
}>()

const t = useI18n()

const searchText = ref("")

const workspaceService = useService(NewWorkspaceService)

const activeWorkspaceHandle = workspaceService.activeWorkspaceHandle

const showModalAdd = ref(false)
const showModalImportExport = ref(false)
</script>
