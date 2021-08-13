<template>
  <section :id="label.toLowerCase()" class="flex flex-col flex-1 relative">
    <slot></slot>
  </section>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  props: {
    label: {
      type: String,
      default: "Section",
    },
  },
})
</script>
