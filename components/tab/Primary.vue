<template>
  <SmartLink
    :to="`${/^\/(?!\/).*$/.test(to) ? localePath(to) : to}`"
    :exact="exact"
    :blank="blank"
    class="
      rounded
      py-2
      px-4
      inline-flex
      items-center
      truncate
      focus:outline-none
    "
    :class="[
      color
        ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
        : 'hover:text-secondaryDark focus-visible:text-accent',
      { 'opacity-75 cursor-not-allowed': disabled },
      { 'flex-row-reverse': reverse },
    ]"
    :disabled="disabled"
  >
    <i
      v-if="icon"
      :class="label ? (reverse ? 'ml-4 opacity-75' : 'mr-4 opacity-75') : ''"
      class="material-icons"
    >
      {{ icon }}
    </i>
    <SmartIcon
      v-if="svg"
      :name="svg"
      :class="label ? (reverse ? 'ml-4 opacity-75' : 'mr-4 opacity-75') : ''"
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
  },
}
</script>
