<template>
  <label
    class="cursor-pointer flex-nowrap transition inline-flex items-center justify-center group hover:text-secondaryDark"
  >
    <input
      type="radio"
      :value="value"
      :checked="value === selected"
      class="appearance-none cursor-pointer mr-4 transition rounded-full h-4 w-4 border-2 border-divider group-hover:border-accentDark checked:border-4 checked:border-accent focus:outline-none"
      @change="$emit('change', value)"
    />
    <span class="font-semibold transition">{{ label }}</span>
  </label>
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
