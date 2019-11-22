<template>
  <fieldset
    :id="label.toLowerCase()"
    :class="{ 'no-colored-frames': !frameColorsEnabled }"
  >
    <legend @click.prevent="collapse">
      <span>{{ label }}</span>
      <i v-if="isCollapsed" class="material-icons">expand_more</i>
      <i v-if="!isCollapsed" class="material-icons">expand_less</i>
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

<script>
export default {
  props: {
    label: {
      type: String,
      default: "Section"
    },
    collapsed: {
      type: Boolean
    }
  },

  data() {
    return {
      isCollapsed: false
    }
  },
  computed: {
    frameColorsEnabled() {
      return this.$store.state.postwoman.settings.FRAME_COLORS_ENABLED || false
    }
  },

  methods: {
    collapse({ target }) {
      const parent = target.parentNode.parentNode
      parent.querySelector(".collapsible").classList.toggle("hidden")
      this.isCollapsed = !this.isCollapsed
    }
  }
}
</script>
