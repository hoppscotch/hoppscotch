<template>
  <section :id="label.toLowerCase()" class="flex flex-col flex-1 relative">
    <slot></slot>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    label: {
      type: String,
      default: "Section",
    },
  },
})
</script>
