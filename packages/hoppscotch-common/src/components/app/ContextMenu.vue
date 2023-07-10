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
  <!-- <tippy
    :to="modelValue"
    interactive
    theme="popover"
    :arrow="false"
    style="`top: ${position.top}px; left: ${position.left}px; `"
    pos="absolute"
  >
    <button>sd</button>
    <template #content>
      <div v-if="contextMenu.options" class="flex flex-col space-y-2">
        <HoppSmartItem
          v-for="option in contextMenu.options"
          :key="option.id"
          :icon="option.icon"
          :label="option.text"
          @click="handleClick(option)"
        />
      </div>
    </template>
  </tippy> -->
</template>

<script lang="ts" setup>
// import { onClickOutside } from "@vueuse/core"
import { useService } from "dioc/vue"
import { ref, watch } from "vue"
import { ContextMenuResult, ContextMenuService } from "~/services/context-menu"
import { EnvironmentMenuService } from "~/services/context-menu/menu/environment.menu"
import { ParameterMenuService } from "~/services/context-menu/menu/parameter.menu"
import { URLMenuService } from "~/services/context-menu/menu/url.menu"

// const tippy = useTippy(() => document.body, {
//   content: "Hello",
//   placement: "right-start",
//   trigger: "manual",
//   interactive: true,
//   arrow: false,
//   theme: "popover",
//   offset: [0, 0],
// })

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
//   if (props.modelValue && props.type !== "ENVIRONMENT_SETTING") {
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
    if (val) {
      const options = contextMenuService.createMenuType(props.text)
      console.log("options", options)
      contextMenuOptions.value = options
    }
  },
  { immediate: true }
)

// const tippyActions = ref<TippyComponent | null>(null)

// const ContextMenuComponent = {
//   render: () =>
//     h("div", [
//       h("span", "Contenx menu"),
//       h("hr"),
//       h("button", { style: { display: "block" } }, props.type),
//       h("button", { style: { display: "block" } }, "Button 2"),
//       h("button", { style: { display: "block" } }, "Button 3"),
//     ]),
// }

// //add onclick event to button

// const { setProps, show, state, setContent } = useTippy(() => document.body, {
//   content: ContextMenuComponent,
//   placement: "right-start",
//   trigger: "manual",
//   interactive: true,
//   arrow: false,
//   theme: "popover",
//   offset: [0, 0],
// })

// watch(
//   () => props.showPopup,
//   (val) => {
//     if (val) {
//       console.log("sdasd", val)
//       nextTick(() => {
//         setProps({
//           getReferenceClientRect: () => ({
//             width: 0,
//             height: 0,
//             top: props.position.top + 30,
//             left: props.position.left,
//             bottom: 0,
//             right: 0,
//           }),
//         })
//         show()
//       })
//     }
//   },
//   { immediate: true }
// )
</script>
