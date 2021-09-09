<template>
  <component :is="src" />
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  computed: {
    src() {
      return require(`~/assets/icons/${this.name}.svg?inline`)
    },
  },
})
</script>
