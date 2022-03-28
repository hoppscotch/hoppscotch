<template>
  <SmartItem
    :label="label"
    :icon="
      value === selected ? 'radio_button_checked' : 'radio_button_unchecked'
    "
    :active="value === selected"
    role="radio"
    :aria-checked="value === selected"
    @click.native="$emit('change', value)"
  />
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    value: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    selected: {
      type: String,
      default: "",
    },
  },
})
</script>
