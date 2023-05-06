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

const props = withDefaults(
  defineProps<{
    label: string | null
    info: string | null
    id: string
    isRemovable: boolean
    closeVisibility: "hover" | "always" | "never"
    selected: boolean
  }>(),
  {
    label: null,
    info: null,
    isRemovable: true,
    closeVisibility: "always",
    selected: false,
  }
)

const tabMeta = computed<TabMeta>(() => ({
  info: props.info,
  label: props.label,
  isRemovable: props.isRemovable,
  icon: slots.icon,
  suffix: slots.suffix,
  tabhead: slots.tabhead,
  closeVisibility: props.closeVisibility,
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
