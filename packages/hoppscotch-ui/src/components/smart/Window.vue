<template>
  <div
    v-if="shouldRender"
    v-show="active"
    class="flex flex-col flex-1 overflow-y-auto"
  >
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
  useSlots,
} from "vue"
import { TabMeta, TabProvider } from "./Windows.vue"

const slots = useSlots()

const props = defineProps({
  label: { type: String, default: null },
  info: { type: String, default: null },
  id: { type: String, default: null, required: true },
  isRemovable: { type: Boolean, default: true },
  selected: {
    type: Boolean,
    default: false,
  },
})

const tabMeta = computed<TabMeta>(() => ({
  info: props.info,
  label: props.label,
  isRemovable: props.isRemovable,
  icon: slots.icon,
  tabhead: slots.tabhead
}))

const {
  activeTabID,
  renderInactive,
  addTabEntry,
  updateTabEntry,
  removeTabEntry,
} = inject<TabProvider>("tabs-system")!

const active = computed(() => activeTabID.value === props.id)

const shouldRender = computed(() => {
  // If render inactive is true, then it should be rendered nonetheless
  if (renderInactive.value) return true

  // Else, return whatever is the active state
  return active.value
})

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
