<template>
  <div class="flex items-center justify-between py-3">
    <div class="flex items-center px-4 space-x-2">
      <span>
        <component :is="IconLibrary" class="svg-icons text-secondaryLight" />
      </span>
      <span v-if="workspace.type === 'personal'" class="text-tiny">
        {{ t("workspace.personal") }}
      </span>
      <span v-else class="text-tiny">
        {{ teamWorkspaceName }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useReadonlyStream } from "~/composables/stream"
import { workspaceStatus$ } from "~/newstore/workspace"
import IconLibrary from "~icons/lucide/library"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const workspace = useReadonlyStream(workspaceStatus$, { type: "personal" })

const teamWorkspaceName = computed(() => {
  if (workspace.value.type === "team" && workspace.value.teamName) {
    return workspace.value.teamName
  } else {
    return `${t("workspace.team")}`
  }
})
</script>
