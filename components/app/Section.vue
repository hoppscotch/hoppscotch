<template>
  <fieldset :id="label.toLowerCase()">
    <legend v-if="!noLegend" @click.prevent="collapse">
      <span>{{ label }}</span>
      <i class="ml-2 align-middle material-icons">
        {{ isCollapsed(label) ? "expand_more" : "expand_less" }}
      </i>
    </legend>
    <div
      class="collapsible"
      :class="{ hidden: isCollapsed(label.toLowerCase()) }"
    >
      <slot></slot>
    </div>
  </fieldset>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  props: {
    label: {
      type: String,
      default: "Section",
    },
    noLegend: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    sectionString(): string {
      return `${this.$route.path.replace(/\/+$/, "")}/${this.label}`
    },
  },

  methods: {
    collapse() {
      // Save collapsed section into the collapsedSections array
      this.$store.commit("setCollapsedSection", this.sectionString)
    },
    isCollapsed(_label: string) {
      return (
        this.$store.state.theme.collapsedSections.includes(
          this.sectionString
        ) || false
      )
    },
  },
})
</script>

<style scoped lang="scss">
fieldset {
  @apply my-4;
  @apply rounded-lg;
  @apply bg-primaryDark;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;
  @apply w-full;

  legend {
    @apply px-4;
    @apply text-secondary;
    @apply font-bold;
    @apply cursor-pointer;
    @apply transition;
    @apply ease-in-out;
    @apply duration-150;
  }
}
</style>
