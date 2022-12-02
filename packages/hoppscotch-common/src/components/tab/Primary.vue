<template>
  <SmartLink
    :to="to"
    :exact="exact"
    :blank="blank"
    class="inline-flex items-center px-4 py-2 truncate rounded transition focus:outline-none"
    :class="[
      color
        ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
        : 'hover:text-secondaryDark focus-visible:text-accent',
      { 'opacity-75 cursor-not-allowed': disabled },
      { 'flex-row-reverse': reverse },
    ]"
    :disabled="disabled"
  >
    <component
      :is="icon"
      v-if="icon"
      class="opacity-75 svg-icons"
      :class="label ? (reverse ? 'ml-4' : 'mr-4') : ''"
    />
    {{ label }}
  </SmartLink>
</template>

<script>
import { defineComponent } from "vue"

export default defineComponent({
  props: {
    to: {
      type: String,
      default: "",
    },
    exact: {
      type: Boolean,
      default: true,
    },
    blank: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    svg: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    reverse: {
      type: Boolean,
      default: false,
    },
  },
})
</script>
