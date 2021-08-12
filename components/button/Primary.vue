<template>
  <SmartLink
    :to="`${/^\/(?!\/).*$/.test(to) ? localePath(to) : to}`"
    :exact="exact"
    :blank="blank"
    class="
      font-bold
      py-2
      transition
      inline-flex
      items-center
      justify-center
      focus:outline-none
    "
    :class="[
      color
        ? `text-${color}-800 bg-${color}-200 hover:(text-${color}-900 bg-${color}-300) focus:(text-${color}-900 bg-${color}-300)`
        : `text-accentContrast bg-accent hover:bg-accentDark focus:bg-accentDark`,
      label ? 'px-4' : 'px-2',
      rounded ? 'rounded-full' : 'rounded',
      { 'opacity-75 cursor-not-allowed': disabled },
      { 'pointer-events-none': loading },
      { 'px-6 py-4 text-lg': large },
      { 'shadow-lg hover:shadow-xl': shadow },
      {
        'text-white bg-gradient-to-tr from-gradientFrom via-gradientVia to-gradientTo':
          gradient,
      },
      {
        'border border-accent hover:border-accentDark focus:border-accentDark':
          outline,
      },
    ]"
    :disabled="disabled"
    :tabindex="loading ? '-1' : '0'"
  >
    <span
      v-if="!loading"
      class="inline-flex items-center justify-center whitespace-nowrap"
      :class="{ 'flex-row-reverse': reverse }"
    >
      <i
        v-if="icon"
        class="material-icons"
        :class="[
          { '!text-2xl': large },
          label ? (reverse ? 'ml-2' : 'mr-2') : '',
        ]"
      >
        {{ icon }}
      </i>
      <SmartIcon
        v-if="svg"
        :name="svg"
        class="svg-icons"
        :class="[
          { '!h-6 !w-6': large },
          label ? (reverse ? 'ml-2' : 'mr-2') : '',
        ]"
      />
      {{ label }}
      <div v-if="shortcut.length && SHORTCUT_INDICATOR" class="ml-2">
        <kbd
          v-for="(key, index) in shortcut"
          :key="`key-${index}`"
          class="bg-accentLight rounded ml-1 px-1 inline-flex"
        >
          {{ key }}
        </kbd>
      </div>
    </span>
    <SmartSpinner v-else />
  </SmartLink>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { useSetting } from "~/newstore/settings"

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
    loading: {
      type: Boolean,
      default: false,
    },
    large: {
      type: Boolean,
      default: false,
    },
    shadow: {
      type: Boolean,
      default: false,
    },
    reverse: {
      type: Boolean,
      default: false,
    },
    rounded: {
      type: Boolean,
      default: false,
    },
    gradient: {
      type: Boolean,
      default: false,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    shortcut: {
      type: Array,
      default: () => [],
    },
  },
  setup() {
    return {
      SHORTCUT_INDICATOR: useSetting("SHORTCUT_INDICATOR"),
    }
  },
})
</script>
