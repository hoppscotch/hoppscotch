<template>
  <SmartLink
    :to="`${/^\/(?!\/).*$/.test(to) ? localePath(to) : to}`"
    :exact="exact"
    :blank="blank"
    class="
      inline-flex
      items-center
      justify-center
      py-2
      font-semibold
      transition
      focus:outline-none
    "
    :class="[
      color
        ? `text-${color}-800 bg-${color}-200 hover:text-${color}-900 hover:bg-${color}-300 focus:text-${color}-900 focus:bg-${color}-300`
        : `text-white dark:text-accentDark bg-accent hover:bg-accentDark focus:bg-accentDark`,
      label ? 'px-4' : 'px-2',
      rounded ? 'rounded-full' : 'rounded-lg',
      { 'opacity-50 cursor-not-allowed': disabled },
      { 'pointer-events-none': loading },
      { 'px-4 py-4 text-lg': large },
      { 'shadow-lg hover:shadow-xl': shadow },
      {
        'text-white bg-gradient-to-tr from-gradientFrom via-gradientVia to-gradientTo':
          gradient,
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
        :class="label ? (reverse ? 'ml-2' : 'mr-2') : ''"
        class="material-icons"
      >
        {{ icon }}
      </i>
      <SmartIcon
        v-if="svg"
        :name="svg"
        :class="label ? (reverse ? 'ml-4' : 'mr-4') : ''"
        class="svg-icons"
      />
      {{ label }}
      <span v-if="shortkey" class="px-1 ml-2 rounded bg-accentLight">{{
        shortkey
      }}</span>
    </span>
    <SmartSpinner v-else />
  </SmartLink>
</template>

<script>
export default {
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
    shortkey: {
      type: String,
      default: "",
    },
  },
}
</script>
