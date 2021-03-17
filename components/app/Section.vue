<template>
  <fieldset :id="label.toLowerCase()">
    <legend v-if="!noLegend" @click.prevent="collapse">
      <span>{{ label }}</span>
      <i class="ml-2 align-middle material-icons">
        {{ isCollapsed(label) ? "expand_more" : "expand_less" }}
      </i>
    </legend>
    <div class="collapsible" :class="{ hidden: isCollapsed(label.toLowerCase()) }">
      <slot />
    </div>
  </fieldset>
</template>

<style scoped lang="scss">
fieldset {
  @apply my-4;
  @apply rounded-lg;
  @apply bg-bgDarkColor;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;
  @apply w-full;

  legend {
    @apply px-4;
    @apply text-fgColor;
    @apply font-bold;
    @apply cursor-pointer;
    @apply transition;
    @apply ease-in-out;
    @apply duration-150;
  }
}
</style>

<script>
export default {
  computed: {
    sectionString() {
      return `${this.$route.path.replace(/\/+$/, "")}/${this.label}`
    },
  },

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

  methods: {
    collapse() {
      // Save collapsed section into the collapsedSections array
      this.$store.commit("setCollapsedSection", this.sectionString)
    },
    isCollapsed(label) {
      return this.$store.state.theme.collapsedSections.includes(this.sectionString) || false
    },
  },
}
</script>
