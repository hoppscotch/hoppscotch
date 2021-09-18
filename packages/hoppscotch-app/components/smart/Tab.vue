<template>
  <div v-show="active">
    <slot></slot>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  name: "SmartTab",
  props: {
    label: { type: String, default: null },
    info: { type: String, default: null },
    icon: { type: String, default: null },
    id: { type: String, default: null, required: true },
    selected: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      active: false,
    }
  },

  mounted() {
    this.active = this.selected
  },
})
</script>
