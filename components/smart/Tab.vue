<template>
  <div v-show="isActive">
    <slot></slot>
  </div>
</template>

<script>
export default {
  props: {
    label: { type: String, default: null },
    icon: { type: String, default: null },
    id: { type: String, default: null, required: true },
    selected: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      isActive: false,
    }
  },

  // computed: {
  //   href() {
  //     return `#${this.label.toLowerCase().replace(/ /g, "-")}`
  //   },
  // },

  mounted() {
    this.isActive = this.selected
  },
}
</script>
