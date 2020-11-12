<template>
  <fieldset :id="label.toLowerCase()" :class="{ 'no-colored-frames': !frameColorsEnabled }">
    <legend @click.prevent="collapse">
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
  @apply my-2;
  @apply p-2;
  @apply rounded-lg;
  @apply bg-bgDarkColor;
  @apply transition;
  @apply ease-in-out;
  @apply duration-200;

  legend {
    @apply text-fgColor;
    @apply text-sm;
    @apply font-bold;
    @apply cursor-pointer;
    @apply transition;
    @apply ease-in-out;
    @apply duration-200;
  }

  &.blue legend {
    @apply text-blue-400;
  }

  &.green legend {
    @apply text-green-400;
  }

  &.teal legend {
    @apply text-teal-400;
  }

  &.purple legend {
    @apply text-purple-400;
  }

  &.orange legend {
    @apply text-orange-400;
  }

  &.pink legend {
    @apply text-pink-400;
  }

  &.red legend {
    @apply text-red-400;
  }

  &.yellow legend {
    @apply text-yellow-400;
  }
}

fieldset.no-colored-frames legend {
  @apply text-fgColor;
}
</style>

<script>
export default {
  computed: {
    frameColorsEnabled() {
      return this.$store.state.postwoman.settings.FRAME_COLORS_ENABLED || false
    },
    sectionString() {
      return `${this.$route.path.replace(/\/+$/, "")}/${this.label}`
    },
  },

  props: {
    label: {
      type: String,
      default: "Section",
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
