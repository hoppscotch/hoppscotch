<template>
  <SmartTabs
    v-model="selectedNavigationTab"
    styles="sticky bg-primary z-10 top-0"
    vertical
  >
    <SmartTab :id="'history'" icon="clock" :label="`${$t('tab.history')}`">
      <History ref="historyComponent" :page="'rest'" />
    </SmartTab>
    <SmartTab
      :id="'collections'"
      icon="folder"
      :label="`${$t('tab.collections')}`"
    >
      <Collections />
    </SmartTab>
    <SmartTab :id="'env'" icon="layers" :label="`${$t('environment.title')}`">
      <Environments />
    </SmartTab>
  </SmartTabs>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"

type RequestOptionTabs = "history" | "collections" | "env"

const selectedNavigationTab = ref<RequestOptionTabs>("history")
</script>
