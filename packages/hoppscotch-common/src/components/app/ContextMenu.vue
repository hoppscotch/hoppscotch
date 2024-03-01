<template>
  <div
    ref="contextMenuRef"
    class="fixed transform -translate-x-10 -translate-y-8 rounded border border-dividerDark bg-popover p-2 shadow-lg"
    :style="`top: ${position.top}px; left: ${position.left}px; z-index: 100;`"
  >
    <div v-if="contextMenuOptions" class="flex flex-col">
      <div
        v-for="option in contextMenuOptions"
        :key="option.id"
        class="flex flex-col space-y-2"
      >
        <HoppSmartItem
          v-if="option.text.type === 'text' && option.text"
          :icon="option.icon"
          :label="option.text.text"
          @click="handleClick(option)"
        />
        <component
          :is="option.text.component"
          v-else-if="option.text.type === 'custom'"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onClickOutside } from "@vueuse/core"
import { useService } from "dioc/vue"
import { ref, watch } from "vue"
import { ContextMenuResult, ContextMenuService } from "~/services/context-menu"
import { EnvironmentMenuService } from "~/services/context-menu/menu/environment.menu"
import { ParameterMenuService } from "~/services/context-menu/menu/parameter.menu"
import { URLMenuService } from "~/services/context-menu/menu/url.menu"

const props = defineProps<{
  show: boolean
  position: { top: number; left: number }
  text: string | null
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const contextMenuRef = ref<any | null>(null)

const contextMenuOptions = ref<ContextMenuResult[]>([])

onClickOutside(contextMenuRef, () => {
  emit("hide-modal")
})

const contextMenuService = useService(ContextMenuService)

useService(EnvironmentMenuService)
useService(ParameterMenuService)
useService(URLMenuService)

const handleClick = (option: { action: () => void }) => {
  option.action()
  emit("hide-modal")
}

watch(
  () => [props.show, props.text],
  (val) => {
    if (val && props.text) {
      const options = contextMenuService.getMenuFor(props.text)
      contextMenuOptions.value = options
    }
  },
  { immediate: true }
)
</script>
