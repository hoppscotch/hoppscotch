<template>
  <SmartLink
    :to="`${/^\/(?!\/).*$/.test(to) ? localePath(to) : to}`"
    :exact="exact"
    :blank="blank"
    class="
      inline-flex
      items-center
      flex-1
      py-2
      font-semibold
      transition
      transform
      hover:translate-x-2
      focus:translate-x-2 focus:outline-none
    "
    :class="[
      label ? 'px-3 rounded-lg' : 'px-2 rounded-full',
      active
        ? color
          ? `text-${color}-500 hover:text-${color}-600 focus:text-${color}-600`
          : 'text-accent'
        : 'hover:text-secondaryDark focus:text-secondaryDark',
      color
        ? `text-${color}-500 hover:text-${color}-600 focus:text-${color}-600`
        : '',
      { 'translate-x-2': active },
      { 'opacity-50 cursor-not-allowed': disabled },
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
    active: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
