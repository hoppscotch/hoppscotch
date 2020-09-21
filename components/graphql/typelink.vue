<template>
  <span class="typelink" @click="jumpToType">{{ typeString }}</span>
</template>

<style scoped lang="scss">
.typelink {
  @apply text-acColor;
  @apply font-mono;
  @apply font-normal;
  @apply cursor-pointer;
}
</style>

<script>
export default {
  props: {
    gqlType: null,
    // (typeName: string) => void
    jumpTypeCallback: Function,
  },

  computed: {
    typeString() {
      return this.gqlType.toString()
    },
  },

  methods: {
    jumpToType() {
      this.jumpTypeCallback(this.gqlType)
    },
  },
}
</script>
