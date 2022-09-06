<template>
  <div v-if="shouldRender" v-show="active" class="flex flex-col flex-1">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from "@nuxtjs/composition-api"
import { TabProvider } from "./Tabs.vue"

const props = withDefaults(
  defineProps<{
    label?: string
    info?: string
    indicator?: boolean
    icon?: string
    id: string
  }>(),
  {
    label: undefined,
    indicator: false,
    info: undefined,
    icon: undefined,
  }
)

const { activeTabID, renderInactive } = inject<TabProvider>("tabs-system")!

const active = computed(() => activeTabID.value === props.id)

const shouldRender = computed(() => {
  // If render inactive is true, then it should be rendered nonetheless
  if (renderInactive.value) return true

  // Else, return whatever is the active state
  return active.value
})

// the tabs component uses implementsTab to identify the components which needs to be treated as a tab
const implementsTab = true
defineExpose({
  implementsTab,
})
</script>
