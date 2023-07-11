<template>
  <div
    ref="contextMenuRef"
    class="fixed bg-popover border border-primaryLight shadow transform translate-y-8 border border-primaryLight shadow"
    :style="`top: ${position.top}px; left: ${position.left}px; z-index: 1000;`"
    @blur="emit('update:modelValue', false)"
  >
    <div v-if="contextMenuOptions" class="flex flex-col space-y-2">
      <HoppSmartItem
        v-for="option in contextMenuOptions"
        :key="option.id"
        :icon="option.icon"
        :label="option.text.text"
        @click="handleClick(option)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
// import { onClickOutside } from "@vueuse/core"
import { useService } from "dioc/vue"
import { ref, watch } from "vue"
import { ContextMenuResult, ContextMenuService } from "~/services/context-menu"
import { EnvironmentMenuService } from "~/services/context-menu/menu/environment.menu"
import { ParameterMenuService } from "~/services/context-menu/menu/parameter.menu"
import { URLMenuService } from "~/services/context-menu/menu/url.menu"

const props = defineProps<{
  modelValue: boolean
  position: { top: number; left: number }
  show: boolean
  text: string | null
}>()

const emit = defineEmits<{
  (e: "action"): void
  (e: "update:modelValue", data: boolean): void
}>()

const contextMenuRef = ref<any | null>(null)

const contextMenuOptions = ref<ContextMenuResult[]>([])

// onClickOutside(contextMenuRef, () => {
//   if (props.modelValue) {
//     console.log("outside", props.modelValue)
//     emit("update:modelValue", false)
//   }
// })

const contextMenuService = useService(ContextMenuService)
useService(EnvironmentMenuService)
useService(ParameterMenuService)
useService(URLMenuService)

const handleClick = (option: { action: () => void }) => {
  option.action()
  emit("update:modelValue", false)
}

watch(
  () => props.show,
  (val) => {
    if (val && props.text) {
      const options = contextMenuService.getMenuFor(props.text)
      console.log("options", options)
      contextMenuOptions.value = options
    }
  },
  { immediate: true }
)
</script>
