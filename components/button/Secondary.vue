<template>
  <SmartLink
    :to="`${/^\/(?!\/).*$/.test(to) ? localePath(to) : to}`"
    :exact="exact"
    :blank="blank"
    class="
      font-semibold
      py-2
      transition
      inline-flex
      items-center
      justify-center
      focus:outline-none
      hover:bg-primaryDark
    "
    :class="[
      color
        ? `text-${color}-400 hover:text-${color}-600 focus:text-${color}-600`
        : 'text-secondary hover:text-secondaryDark focus:text-secondaryDark',
      label ? 'px-4' : 'px-2',
      rounded ? 'rounded-full' : 'rounded',
      { 'opacity-75 cursor-not-allowed': disabled },
      { 'flex-row-reverse': reverse },
      { 'px-6 py-4 text-lg': large },
      {
        'border border-divider hover:border-dividerDark focus:border-dividerDark':
          outline,
      },
    ]"
    :disabled="disabled"
  >
    <i
      v-if="icon"
      :class="[
        'material-icons',
        { '!text-2xl': large },
        label ? (reverse ? 'ml-2' : 'mr-2') : '',
      ]"
    >
      {{ icon }}
    </i>
    <SmartIcon
      v-if="svg"
      :name="svg"
      :class="[
        'svg-icons',
        { '!h-6 !w-6': large },
        label ? (reverse ? 'ml-2' : 'mr-2') : '',
      ]"
    />
    {{ label }}
    <div v-if="shortcut.length && SHORTCUT_INDICATOR" class="ml-2">
      <kbd
        v-for="(key, index) in shortcut"
        :key="`key-${index}`"
        class="
          bg-dividerLight
          rounded
          text-secondaryLight
          ml-1
          px-1
          inline-flex
        "
      >
        {{ key }}
      </kbd>
    </div>
  </SmartLink>
</template>

<script>
import { getSettingSubject } from "~/newstore/settings"

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
    large: {
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
  data() {
    return {
      SHORTCUT_INDICATOR: null,
    }
  },
  subscriptions() {
    return {
      SHORTCUT_INDICATOR: getSettingSubject("SHORTCUT_INDICATOR"),
    }
  },
}
</script>
