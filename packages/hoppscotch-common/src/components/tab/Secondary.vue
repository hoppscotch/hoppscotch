<template>
  <HoppSmartLink
    :to="to"
    :exact="exact"
    :blank="blank"
    class="inline-flex transform items-center py-2 font-semibold transition hover:translate-x-2 focus:outline-none focus-visible:translate-x-2"
    :class="[
      label ? 'px-4' : 'px-2',
      active
        ? color
          ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
          : 'text-accent hover:text-accentDark focus-visible:text-accentDark'
        : 'hover:text-secondaryDark focus-visible:text-secondaryDark',
      color
        ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
        : '',
      { 'cursor-not-allowed opacity-75': disabled },
    ]"
    :disabled="disabled"
    type="button"
  >
    <component
      :is="icon"
      v-if="icon"
      class="svg-icons"
      :class="label ? 'mr-4 opacity-75' : ''"
    />
    <div class="max-w-[16rem] truncate">
      {{ label }}
    </div>
  </HoppSmartLink>
</template>

<script lang="ts">
import { defineComponent, Component, PropType } from "vue"

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
      type: Object as PropType<Component | null>,
      default: null,
    },
    svg: {
      type: Object as PropType<Component | null>,
      default: null,
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
