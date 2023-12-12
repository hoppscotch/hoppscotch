<template>
  <HoppSmartLink
    :to="to"
    :blank="blank"
    class="relative inline-flex items-center justify-center whitespace-nowrap py-2 font-semibold transition focus:outline-none focus-visible:bg-accentDark"
    :exact="exact"
    :class="[
      color
        ? `text-${color}-800 bg-${color}-200 hover:(text-${color}-900 bg-${color}-300) focus-visible:(text-${color}-900 bg-${color}-300)`
        : `bg-accent text-accentContrast hover:bg-accentDark focus-visible:bg-accentDark`,
      label ? 'px-4 py-2' : 'p-2',
      rounded ? 'rounded-full' : 'rounded',
      { 'cursor-not-allowed opacity-75': disabled },
      { 'pointer-events-none': loading },
      { 'px-6 py-4 text-lg': large },
      { 'shadow-lg hover:shadow-xl': shadow },
      {
        'bg-gradient-to-tr from-gradientFrom via-gradientVia to-gradientTo text-white':
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
      class="inline-flex items-center justify-center whitespace-nowrap"
      :class="[{ 'flex-row-reverse': reverse }, { 'opacity-50': loading }]"
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
      <div class="max-w-[16rem] truncate">
        {{ label }}
      </div>
      <div v-if="shortcut.length" class="<sm:hidden">
        <kbd
          v-for="(key, index) in shortcut"
          :key="`key-${index}`"
          class="shortcut-key !border-accentLight !bg-accentDark"
        >
          {{ key }}
        </kbd>
      </div>
    </span>
    <span
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center"
    >
      <HoppSmartSpinner />
    </span>
  </HoppSmartLink>
</template>

<script setup lang="ts">
import { HoppSmartLink, HoppSmartSpinner } from "../smart"
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
