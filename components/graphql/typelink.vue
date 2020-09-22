<template>
  <span class="font-mono font-normal cursor-pointer text-acColor" @click="jumpToType">
    {{ typeString }}
  </span>
</template>

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
