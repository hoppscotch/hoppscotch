<template>
  <div>
    <Transition name="fade" appear>
      <div
        v-if="show"
        class="fixed inset-0 z-20 transition-opacity"
        @keydown.esc="close()"
      >
        <div
          class="absolute inset-0 bg-primaryLight opacity-90 focus:outline-none"
          tabindex="0"
          @click="close()"
        ></div>
      </div>
    </Transition>
    <Transition name="slide" appear>
      <aside
        v-if="show"
        class="fixed top-0 right-0 z-30 flex flex-col h-full max-w-full overflow-auto border-l shadow-xl border-dividerDark bg-primary w-96"
      >
        <div
          class="flex items-center justify-between p-2 border-b border-dividerLight"
        >
          <h3 class="ml-4 heading">{{ title }}</h3>
          <span class="flex items-center">
            <kbd class="mr-2 shortcut-key">ESC</kbd>
            <ButtonSecondary :icon="IconX" @click="close()" />
          </span>
        </div>
        <slot name="content"></slot>
      </aside>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue"
import IconX from "~icons/lucide/x"

const props = defineProps<{
  show: boolean
  title: string
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

watch(
  () => props.show,
  (show) => {
    if (show) document.body.style.setProperty("overflow", "hidden")
    else document.body.style.removeProperty("overflow")
  }
)

onMounted(() => {
  document.addEventListener("keydown", (e) => {
    if (e.keyCode === 27 && props.show) close()
  })
})

const close = () => {
  emit("close")
}
</script>
