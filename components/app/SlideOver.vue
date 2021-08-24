<template>
  <div>
    <transition v-if="show" name="fade" appear>
      <div class="inset-0 transition-opacity z-20 fixed" @keydown.esc="close()">
        <div
          class="bg-primaryDark opacity-90 inset-0 absolute"
          tabindex="0"
          @click="close()"
        ></div>
      </div>
    </transition>
    <aside
      class="
        bg-primary
        flex flex-col
        h-full
        max-w-full
        shadow-xl
        transform
        transition
        top-0
        ease-in-out
        right-0
        w-96
        z-30
        duration-300
        fixed
        overflow-auto
      "
      :class="show ? 'translate-x-0' : 'translate-x-full'"
    >
      <slot name="content"></slot>
    </aside>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    show: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  watch: {
    show: {
      immediate: true,
      handler(show) {
        if (process.client) {
          if (show) document.body.style.setProperty("overflow", "hidden")
          else document.body.style.removeProperty("overflow")
        }
      },
    },
  },
  mounted() {
    document.addEventListener("keydown", (e) => {
      if (e.keyCode === 27 && this.show) this.close()
    })
  },
  methods: {
    close() {
      this.$emit("close")
    },
  },
})
</script>
