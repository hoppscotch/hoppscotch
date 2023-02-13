<template>
  <div
    class="flex items-center whitespace-nowrap overflow-x-auto border-b border-dividerLight text-tiny text-secondaryLight py-2 px-4"
  >
    {{
      `${
        workspace.type === "personal"
          ? t("workspace.personal")
          : teamWorkspaceName
      } \xA0 › \xA0 ${section}`
    }}
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useReadonlyStream } from "~/composables/stream"
import { workspaceStatus$ } from "~/newstore/workspace"
import { useI18n } from "~/composables/i18n"

defineProps<{
  section?: string
}>()

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
