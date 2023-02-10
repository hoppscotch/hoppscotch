<template>
  <HoppSmartTabs
    v-model="selectedNavigationTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary z-10 top-0"
    vertical
    render-inactive-tabs
  >
    <HoppSmartTab
      :id="'history'"
      :icon="IconClock"
      :label="`${t('tab.history')}`"
    >
      <History :page="'rest'" />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'collections'"
      :icon="IconFolder"
      :label="`${t('tab.collections')}`"
    >
      <Collections />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'env'"
      :icon="IconLayers"
      :label="`${t('environment.title')}`"
    >
      <Environments />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import IconClock from "~icons/lucide/clock"
import IconLayers from "~icons/lucide/layers"
import IconFolder from "~icons/lucide/folder"
import IconUser from "~icons/lucide/user"
import IconUsers from "~icons/lucide/users"
import IconMore from "~icons/lucide/more-vertical"
import { computed, ref } from "vue"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { workspaceStatus$ } from "~/newstore/workspace"
import IconEdit from "~icons/lucide/edit"
import { TippyComponent } from "vue-tippy"

const t = useI18n()

type RequestOptionTabs = "history" | "collections" | "env"

const selectedNavigationTab = ref<RequestOptionTabs>("history")

const workspace = useReadonlyStream(workspaceStatus$, { type: "personal" })

const teamWorkspaceName = computed(() => {
  if (workspace.value.type === "team" && workspace.value.teamName) {
    return workspace.value.teamName
  } else {
    return `${t("workspace.team")}`
  }
})
const tippyActions = ref<TippyComponent | null>(null)
</script>
