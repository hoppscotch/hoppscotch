<template>
  <div v-show="active">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, inject, computed, watch } from "vue"
import { TabMeta, TabProvider } from "./Windows.vue"
const props = defineProps({
  label: { type: String, default: null },
  info: { type: String, default: null },
  icon: { type: String, default: null },
  iconColor: { type: String, default: null },
  id: { type: String, default: null, required: true },
  isRemovable: { type: Boolean, default: true },
  selected: {
    type: Boolean,
    default: false,
  },
})
const tabMeta = computed<TabMeta>(() => ({
  icon: props.icon,
  iconColor: props.iconColor,
  info: props.info,
  label: props.label,
  isRemovable: props.isRemovable,
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
