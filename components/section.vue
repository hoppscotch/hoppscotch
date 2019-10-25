<template>
  <fieldset :id="label.toLowerCase()" :class="{ 'no-colored-frames': noFrameColors }">
    <legend @click.prevent="collapse">
      <i class="material-icons icon">{{ icon }}</i>
      <span>{{ label }}</span>
      <i class="material-icons" v-if="isCollapsed">expand_more</i>
      <i class="material-icons" v-if="!isCollapsed">expand_less</i>
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
  .icon {
    margin-right: 8px;
  }
</style>

<script>
  export default {
    computed: {
      noFrameColors() {
        return this.$store.state.postwoman.settings.DISABLE_FRAME_COLORS || false;
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
      icon: {
        type: String,
        default: "lens"
      },
      collapsed: {
        type: Boolean
      }
    },

    methods: {
      collapse({ target }) {
        const parent = target.parentNode.parentNode;
        parent.querySelector(".collapsible").classList.toggle("hidden");
        this.isCollapsed = !this.isCollapsed;
      }
    }
  };
</script>
