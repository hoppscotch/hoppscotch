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
    "
    :class="[
      color
        ? `text-${color}-400 hover:text-${color}-600 focus:text-${color}-600`
        : 'text-secondary hover:text-secondaryDark focus:text-secondaryDark',
      label ? 'px-3' : 'px-2',
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
    <div v-if="shortcuts.length && SHORTCUTS_INDICATOR_ENABLED" class="ml-2">
      <kbd
        v-for="(key, index) in shortcuts"
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
    outline: {
      type: Boolean,
      default: false,
    },
    shortcuts: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      SHORTCUTS_INDICATOR_ENABLED: null,
    }
  },
  subscriptions() {
    return {
      SHORTCUTS_INDICATOR_ENABLED: getSettingSubject(
        "SHORTCUTS_INDICATOR_ENABLED"
      ),
    }
  },
}
</script>
