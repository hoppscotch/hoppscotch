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
        ? `text-${color}-500 hover:text-${color}-600 focus:text-${color}-600`
        : 'text-secondaryLight hover:text-secondary focus:text-secondary',
      label ? 'px-3 rounded-lg' : 'px-2 rounded-full',
      rounded ? 'rounded-full' : 'rounded-lg',
      { 'opacity-50 cursor-not-allowed': disabled },
      { 'flex-row-reverse': reverse },
      {
        'border border-divider hover:border-dividerDark focus:border-dividerDark':
          outline,
      },
    ]"
    :disabled="disabled"
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
      :class="label ? (reverse ? 'ml-2' : 'mr-2') : ''"
      class="svg-icons"
    />
    {{ label }}
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
    reverse: {
      type: Boolean,
      default: false,
    },
    rounded: {
      type: Boolean,
      default: false,
    },
    outline: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
