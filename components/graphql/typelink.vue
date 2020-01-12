<template>
  <span class="typelink" @click="jumpToType">{{ typeString }}</span>
</template>

<style>
.typelink {
  color: var(--ac-color);
  font-family: "Roboto Mono", monospace;
  font-weight: 400;
  cursor: pointer;
}
</style>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: {
    gqlType: null as any,
    // (typeName: string) => void
    jumpTypeCallback: Function
  },

  computed: {
    typeString(): string {
      return (this.gqlType as any).toString();
    }
  },

  methods: {
    jumpToType() {
      this.jumpTypeCallback(this.gqlType);
    }
  }
});
</script>
