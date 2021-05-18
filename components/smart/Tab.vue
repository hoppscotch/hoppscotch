<template>
  <div v-show="isActive">
    <slot></slot>
  </div>
</template>

<script>
export default {
  props: {
    label: { type: String, default: "" },
    icon: { type: String, default: "" },
    id: { type: String, default: "", required: true },
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
