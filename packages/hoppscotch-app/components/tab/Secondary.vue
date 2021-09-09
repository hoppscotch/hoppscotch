<template>
  <SmartLink
    :to="`${/^\/(?!\/).*$/.test(to) ? localePath(to) : to}`"
    :exact="exact"
    :blank="blank"
    class="
      font-medium
      flex-1
      py-2
      transition
      transform
      inline-flex
      items-center
      truncate
      hover:translate-x-2
      focus:outline-none
      focus-visible:translate-x-2
    "
    :class="[
      label ? 'px-3' : 'px-2',
      active
        ? color
          ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
          : 'text-accent hover:text-accentDark focus-visible:text-accentDark'
        : 'hover:text-secondaryDark focus-visible:text-secondaryDark',
      color
        ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
        : '',
      { 'opacity-75 cursor-not-allowed': disabled },
    ]"
    :disabled="disabled"
    type="button"
  >
    <i
      v-if="icon"
      :class="label ? 'mr-4 opacity-75' : ''"
      class="material-icons"
    >
      {{ icon }}
    </i>
    <SmartIcon
      v-if="svg"
      :name="svg"
      :class="label ? 'mr-4 opacity-75' : ''"
      class="svg-icons"
    />
    {{ label }}
  </SmartLink>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

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
    active: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
})
</script>
