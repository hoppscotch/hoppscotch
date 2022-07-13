<template>
  <SmartLink
    :to="to"
    :exact="exact"
    :blank="blank"
    class="inline-flex items-center justify-center focus:outline-none"
    :class="[
      color
        ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
        : 'hover:text-secondaryDark focus-visible:text-secondaryDark',
      { 'opacity-75 cursor-not-allowed': disabled },
      { 'flex-row-reverse': reverse },
    ]"
    :disabled="disabled"
  >
    <!-- icon and svg used to be different things, but they are not now-->
    <!-- But I am keeping this for legacy now-->
    <component
      v-if="icon"
      :is="icon"
      :class="label ? (reverse ? 'ml-2' : 'mr-2') : ''"
    />
    <component
      v-if="svg"
      :is="svg"
      :class="label ? (reverse ? 'ml-2' : 'mr-2') : ''"
    />
    {{ label }}
  </SmartLink>
</template>

<script lang="ts">
import { Component, defineComponent, PropType } from "vue"

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
