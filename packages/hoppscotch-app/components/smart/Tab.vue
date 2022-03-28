<template>
  <div v-show="active" class="flex flex-col flex-1">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  onBeforeUnmount,
  inject,
  computed,
  watch,
} from "@nuxtjs/composition-api"
import { TabMeta, TabProvider } from "./Tabs.vue"

const props = defineProps({
  label: { type: String, default: null },
  info: { type: String, default: null },
  indicator: { type: Boolean, default: false },
  icon: { type: String, default: null },
  id: { type: String, default: null, required: true },
  selected: {
    type: Boolean,
    default: false,
  },
})

const tabMeta = computed<TabMeta>(() => ({
  icon: props.icon,
  indicator: props.indicator,
  info: props.info,
  label: props.label,
}))

const { activeTabID, addTabEntry, updateTabEntry, removeTabEntry } =
  inject<TabProvider>("tabs-system")!

const active = computed(() => activeTabID.value === props.id)

onMounted(() => {
  addTabEntry(props.id, tabMeta.value)
})

watch(tabMeta, (newMeta) => {
  updateTabEntry(props.id, newMeta)
})

onBeforeUnmount(() => {
  removeTabEntry(props.id)
})
</script>
