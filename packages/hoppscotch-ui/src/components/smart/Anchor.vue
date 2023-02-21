<template>
  <HoppSmartLink :to="to" :exact="exact" :blank="blank" class="inline-flex items-center justify-center focus:outline-none"
    :class="[
      color
        ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
        : 'hover:text-secondaryDark focus-visible:text-secondaryDark',
      { 'opacity-75 cursor-not-allowed': disabled },
      { 'flex-row-reverse': reverse },
    ]" :disabled="disabled" tabindex="0">
    <component :is="icon" v-if="icon" class="svg-icons" :class="label ? (reverse ? 'ml-2' : 'mr-2') : ''" />
    {{ label }}
  </HoppSmartLink>
</template>

<script lang="ts">
import HoppSmartLink from "./Link.vue";
import { Component, defineComponent, PropType } from "vue"

export default defineComponent({
  components: {
    HoppSmartLink
  },
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
