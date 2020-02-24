<template>
  <span class="typelink" @click="jumpToType">{{ typeString }}</span>
</template>

<style scoped lang="scss">
.typelink {
  color: var(--ac-color);
  font-family: 'Roboto Mono', monospace;
  font-weight: 400;
  cursor: pointer;
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
