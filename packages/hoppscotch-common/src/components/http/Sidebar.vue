<template>
  <HoppSmartTabs
    v-model="selectedNavigationTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary z-10 top-0"
    vertical
    render-inactive-tabs
    collapsible
    :is-collapsed="collapsed"
    :is-active="isActive"
    @tab-click="tabClick"
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
import { computed, ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useSetting } from "@composables/settings"

const t = useI18n()

const SIDEBAR_COLLAPSED = useSetting("SIDEBAR_COLLAPSED")
const collapsed = ref(false)

type RequestOptionTabs = "history" | "collections" | "env"

const selectedNavigationTab = ref<RequestOptionTabs>("history")

watch(
  () => SIDEBAR_COLLAPSED.value.isCollapsed,
  (isCollapsed) => {
    if (isCollapsed) {
      collapsed.value = true
    } else {
      collapsed.value = false
    }
  }
)

const isActive = computed(() => {
  if (SIDEBAR_COLLAPSED.value.isCollapsed) {
    return false
  } else {
    return !collapsed.value
  }
})

const tabClick = (payload: { isHidden: boolean; width: number }) => {
  if (!SIDEBAR_COLLAPSED.value.isCollapsed && payload.isHidden) {
    SIDEBAR_COLLAPSED.value = {
      isCollapsed: !SIDEBAR_COLLAPSED.value.isCollapsed,
      collapsedWidth: payload.width,
    }
  } else {
    SIDEBAR_COLLAPSED.value = {
      isCollapsed: false,
      collapsedWidth: payload.width,
    }
  }
}
</script>
