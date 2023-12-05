<template>
  <HoppSmartLink
    :to="to"
    :exact="exact"
    :blank="blank"
    class="inline-flex items-center truncate rounded px-4 py-2 transition focus:outline-none"
    :class="[
      color
        ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
        : 'hover:text-secondaryDark focus-visible:text-accent',
      { 'cursor-not-allowed opacity-75': disabled },
      { 'flex-row-reverse': reverse },
    ]"
    :disabled="disabled"
  >
    <component
      :is="icon"
      v-if="icon"
      class="svg-icons opacity-75"
      :class="label ? (reverse ? 'ml-4' : 'mr-4') : ''"
    />
    <div class="max-w-[16rem] truncate">
      {{ label }}
    </div>
  </HoppSmartLink>
</template>

<script lang="ts">
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
