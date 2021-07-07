<template>
  <section :id="label.toLowerCase()">
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
