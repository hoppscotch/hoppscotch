<template>
  <SmartLink
    :to="to"
    :blank="blank"
    class="inline-flex items-center justify-center py-2 font-bold transition focus:outline-none focus-visible:bg-accentDark"
    :class="[
      color
        ? `text-${color}-800 bg-${color}-200 hover:(text-${color}-900 bg-${color}-300) focus-visible:(text-${color}-900 bg-${color}-300)`
        : `text-accentContrast bg-accent hover:bg-accentDark focus-visible:bg-accentDark`,
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
        'border border-accent hover:border-accentDark focus-visible:border-accentDark':
          outline,
      },
    ]"
    :disabled="disabled"
    :tabindex="loading ? '-1' : '0'"
    role="button"
  >
    <span
      v-if="!loading"
      class="inline-flex items-center justify-center whitespace-nowrap"
      :class="{ 'flex-row-reverse': reverse }"
    >
      <component
        :is="icon"
        v-if="icon"
        class="svg-icons"
        :class="[
          { '!text-2xl': large },
          label ? (reverse ? 'ml-2' : 'mr-2') : '',
        ]"
      />
      {{ label }}
      <div v-if="shortcut.length" class="<sm:hidden">
        <kbd
          v-for="(key, index) in shortcut"
          :key="`key-${index}`"
          class="shortcut-key !bg-accentDark !border-accentLight"
        >
          {{ key }}
        </kbd>
      </div>
    </span>
    <SmartSpinner v-else />
  </SmartLink>
</template>

<script setup lang="ts">
import type { Component } from "vue"

interface Props {
  to?: string
  exact?: boolean
  blank?: boolean
  label?: string
  icon?: object | null | Component // It is a component!
  svg?: object | null | Component // It is a component!
  color?: string
  disabled?: boolean
  loading?: boolean
  large?: boolean
  shadow?: boolean
  reverse?: boolean
  rounded?: boolean
  gradient?: boolean
  outline?: boolean
  shortcut?: string[]
}
withDefaults(defineProps<Props>(), {
  to: "",
  exact: true,
  blank: false,
  label: "",
  icon: null,
  svg: null,
  color: "",
  disabled: false,
  loading: false,
  large: false,
  shadow: false,
  reverse: false,
  rounded: false,
  gradient: false,
  outline: false,
  shortcut: () => [],
})
</script>
