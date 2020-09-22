<template>
  <fieldset :id="label.toLowerCase()" :class="{ 'no-colored-frames': !frameColorsEnabled }">
    <legend @click.prevent="collapse">
      <span>{{ label }}</span>
      <i class="material-icons">
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

    i {
      @apply ml-2;
      @apply align-middle;
    }
  }

  &.blue legend {
    color: #57b5f9;
  }

  &.gray legend {
    color: #bcc2cd;
  }

  &.green legend {
    color: #50fa7b;
  }

  &.cyan legend {
    color: #8be9fd;
  }

  &.purple legend {
    color: #bd93f9;
  }

  &.orange legend {
    color: #ffb86c;
  }

  &.pink legend {
    color: #ff79c6;
  }

  &.red legend {
    color: #ff5555;
  }

  &.yellow legend {
    color: #f1fa8c;
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
    collapsed: {
      type: Boolean,
    },
  },

  methods: {
    collapse({ target }) {
      const parent = target.parentNode.parentNode
      parent.querySelector(".collapsible").classList.toggle("hidden")

      // Save collapsed section into the collapsedSections array
      this.$store.commit("setCollapsedSection", this.sectionString)
    },
    isCollapsed(label) {
      return this.$store.state.theme.collapsedSections.includes(this.sectionString) || false
    },
  },
}
</script>
