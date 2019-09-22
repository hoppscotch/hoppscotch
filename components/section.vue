<template>
  <fieldset :id="label.toLowerCase()" :class="{ 'no-colored-frames': noFrameColors }">
    <legend @click.prevent="collapse">{{ label }} ↕</legend>
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
  computed: {
    noFrameColors() {
      return this.$store.state.postwoman.settings.DISABLE_FRAME_COLORS || false;
    }
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
    collapse({ target }) {
      const parent = target.parentNode;
      parent.querySelector(".collapsible").classList.toggle("hidden");
    }
  }
};
</script>
