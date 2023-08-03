<template>
  <HoppSmartLink
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
    tabindex="0"
  >
    <component
      :is="icon"
      v-if="icon"
      class="svg-icons"
      :class="label ? (reverse ? 'ml-2' : 'mr-2') : ''"
    />
    {{ label }}
  </HoppSmartLink>
</template>

<script setup lang="ts">
import HoppSmartLink from "./Link.vue"
import type { Component } from "vue"

withDefaults(
  defineProps<{
    to: string
    exact: boolean
    blank: boolean
    label: string
    icon: Component | null
    svg: Component | null
    color: string
    disabled: boolean
    reverse: boolean
  }>(),
  {
    to: "",
    exact: true,
    blank: false,
    label: "",
    icon: null,
    svg: null,
    color: "",
    disabled: false,
    reverse: false,
  }
)
</script>
