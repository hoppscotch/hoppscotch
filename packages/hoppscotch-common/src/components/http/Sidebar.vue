<template>
  <HoppSmartTabs
    v-model="selectedNavigationTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary z-10 top-0"
    vertical
    render-inactive-tabs
  >
    <HoppSmartTab
      :id="'collections'"
      :icon="IconFolder"
      :label="`${t('tab.collections')}`"
    >
      <!-- <Collections /> -->
      <NewCollections :platform="'rest'" />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'env'"
      :icon="IconLayers"
      :label="`${t('tab.environments')}`"
    >
      <Environments />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'history'"
      :icon="IconClock"
      :label="`${t('tab.history')}`"
    >
      <History :page="'rest'" />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'share-request'"
      :icon="IconShare2"
      :label="`${t('tab.shared_requests')}`"
    >
      <Share />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { ref } from "vue"

import IconClock from "~icons/lucide/clock"
import IconFolder from "~icons/lucide/folder"
import IconLayers from "~icons/lucide/layers"
import IconShare2 from "~icons/lucide/share-2"

const t = useI18n()

type RequestOptionTabs = "history" | "collections" | "env"

const selectedNavigationTab = ref<RequestOptionTabs>("collections")
</script>
