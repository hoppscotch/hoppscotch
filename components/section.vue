<template>
  <fieldset
    :id="label.toLowerCase()"
    :class="{ 'no-colored-frames': !frameColorsEnabled }"
  >
    <legend @click.prevent="collapse">
      <span>{{ label }}</span>
      <i class="material-icons">
        {{ isCollapsed ? "expand_more" : "expand_less" }}
      </i>
    </legend>
    <div class="collapsible" :class="{ hidden: collapsed }">
      <slot />
    </div>
  </fieldset>
</template>

<style>
fieldset.no-colored-frames legend {
  color: var(--fg-color);
}
</style>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  computed: {
    frameColorsEnabled() {
      return this.$store.state.postwoman.settings.FRAME_COLORS_ENABLED || false;
    }
  },

  data() {
    return {
      isCollapsed: false
    };
  },

  props: {
    label: {
      type: String,
      default: "Section"
    },
    collapsed: {
      type: Boolean
    }
  },

  methods: {
    collapse({ target }: { target: any }) {
      const parent = target.parentNode.parentNode;
      parent.querySelector(".collapsible").classList.toggle("hidden");
      this.isCollapsed = !this.isCollapsed;
    }
  }
});
</script>
