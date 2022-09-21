<template>
  <SmartLink
    :to="to"
    :exact="exact"
    :blank="blank"
    class="inline-flex items-center justify-center py-2 font-semibold transition whitespace-nowrap focus:outline-none"
    :class="[
      color
        ? `text-${color}-500 hover:text-${color}-600 focus-visible:text-${color}-600`
        : 'text-secondary hover:text-secondaryDark focus-visible:text-secondaryDark',
      { 'pointer-events-none': loading },
      label ? 'rounded px-4' : 'px-2',
      { 'rounded-full': rounded },
      { 'opacity-75 cursor-not-allowed': disabled },
      { 'flex-row-reverse': reverse },
      { 'px-6 py-4 text-lg': large },
      {
        'border border-divider hover:border-dividerDark focus-visible:border-dividerDark':
          outline,
      },
      {
        'bg-primaryLight hover:bg-primaryDark focus-visible:bg-primaryDark':
          filled,
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
      <div v-if="shortcut.length" class="ml-2 <sm:hidden">
        <kbd
          v-for="(key, index) in shortcut"
          :key="`key-${index}`"
          class="shortcut-key"
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
  reverse?: boolean
  rounded?: boolean
  large?: boolean
  outline?: boolean
  shortcut?: string[]
  filled?: boolean
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
  reverse: false,
  rounded: false,
  large: false,
  outline: false,
  shortcut: () => [],
  filled: false,
})
</script>
