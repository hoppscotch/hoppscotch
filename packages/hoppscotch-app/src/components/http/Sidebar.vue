<template>
  <SmartTabs
    v-model="selectedNavigationTab"
    styles="sticky bg-primary z-10 top-0"
    vertical
    render-inactive-tabs
  >
    <SmartTab :id="'history'" :icon="IconClock" :label="`${t('tab.history')}`">
      <History :page="'rest'" />
    </SmartTab>
    <SmartTab
      :id="'collections'"
      :icon="IconFolder"
      :label="`${t('tab.collections')}`"
    >
      <Collections />
    </SmartTab>
    <SmartTab
      :id="'env'"
      :icon="IconLayers"
      :label="`${t('environment.title')}`"
    >
      <Environments />
    </SmartTab>
  </SmartTabs>
</template>

<script setup lang="ts">
import IconClock from "~icons/lucide/clock"
import IconLayers from "~icons/lucide/layers"
import IconFolder from "~icons/lucide/folder"
import { ref } from "vue"
import { useI18n } from "@composables/i18n"

const t = useI18n()

type RequestOptionTabs = "history" | "collections" | "env"

const selectedNavigationTab = ref<RequestOptionTabs>("history")
</script>
