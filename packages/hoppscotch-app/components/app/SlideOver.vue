<template>
  <div>
    <transition v-if="show" name="fade" appear>
      <div class="fixed inset-0 z-20 transition-opacity" @keydown.esc="close()">
        <div
          class="absolute inset-0 bg-primaryLight opacity-90"
          tabindex="0"
          @click="close()"
        ></div>
      </div>
    </transition>
    <aside
      class="fixed top-0 right-0 z-30 flex flex-col h-full max-w-full overflow-auto transition duration-300 ease-in-out transform bg-primary w-96 hide-scrollbar"
      :class="show ? 'shadow-xl translate-x-0' : 'translate-x-full'"
    >
      <slot name="content"></slot>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from "@nuxtjs/composition-api"

const props = defineProps<{
  show: Boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

watch(
  () => props.show,
  (show) => {
    if (process.client) {
      if (show) document.body.style.setProperty("overflow", "hidden")
      else document.body.style.removeProperty("overflow")
    }
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
