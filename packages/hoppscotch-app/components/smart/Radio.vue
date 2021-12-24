<template>
  <div
    class="cursor-pointer flex flex-nowrap transition flex-1 items-center group hover:text-secondaryDark"
    @click="$emit('change', value)"
  >
    <span class="inline-flex mr-4">
      <i v-if="value === selected" class="text-accent material-icons">
        radio_button_checked
      </i>
      <i v-else class="material-icons">radio_button_unchecked</i>
    </span>
    <span class="font-semibold inline-flex">{{ label }}</span>
  </div>
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
