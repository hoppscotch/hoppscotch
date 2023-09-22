<template>
  <div v-if="shouldRender" v-show="active" class="flex flex-col flex-1">
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
  Component,
  markRaw,
} from "vue"
import { TabMeta, TabProvider } from "./Tabs.vue"

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    icon?: Component | object | string | null
    info?: string | null
    indicator?: boolean
    disabled?: boolean
  }>(),
  {
    icon: null,
    indicator: false,
    info: null,
    disabled: false,
  }
)

const tabMeta = computed<TabMeta>(() => ({
  // props.icon can store a component, which should not be made deeply reactive
  icon:
    props.icon && typeof props.icon === "object"
      ? markRaw(props.icon)
      : props.icon,

  indicator: props.indicator,
  info: props.info,
  label: props.label,
  disabled: props.disabled,
}))

const {
  activeTabID,
  renderInactive,
  addTabEntry,
  updateTabEntry,
  removeTabEntry,
  isUnmounting,
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
  if (isUnmounting.value) return
  removeTabEntry(props.id)
})
</script>
