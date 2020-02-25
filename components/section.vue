<template>
  <fieldset :id="label.toLowerCase()" :class="{ 'no-colored-frames': !frameColorsEnabled }">
    <legend @click.prevent="collapse">
      <span>{{ label }}</span>
      <i class="material-icons">
        {{ isCollapsed(label) ? "expand_more" : "expand_less" }}
      </i>
    </legend>
    <div
      class="collapsible"
      :class="{ hidden: isCollapsed(label.toLowerCase()) }"
    >
      <slot />
    </div>
  </fieldset>
</template>

<style scoped lang="scss">
fieldset.no-colored-frames legend {
  color: var(--fg-color);
}
</style>

<script>
export default {
  computed: {
    frameColorsEnabled() {
      return this.$store.state.postwoman.settings.FRAME_COLORS_ENABLED || false;
    },
    sectionString() {
      return `${this.$route.path}/${this.label}`;
    }
  },

  props: {
    label: {
      type: String,
      default: "Section",
    },
    collapsed: {
      type: Boolean,
    },
  },

  methods: {
    collapse({ target }) {
      const parent = target.parentNode.parentNode;
      parent.querySelector(".collapsible").classList.toggle("hidden");
      // Save collapsed section into the collapsedSections array
      this.$store.commit("setCollapsedSection", this.sectionString);
    },
    isCollapsed(label) {
      return (
        this.$store.state.theme.collapsedSections.includes(
          this.sectionString
        ) || false
      );
    }
  }
};
</script>
