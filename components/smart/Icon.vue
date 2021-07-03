<template>
  <component :is="src" />
</template>

<script>
export default {
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
}
</script>
