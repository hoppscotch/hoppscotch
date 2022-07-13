<template>
  <button
    v-if="renderedTag === 'BUTTON'"
    aria-label="Button"
    role="button"
    v-bind="$attrs"
  >
    <slot></slot>
  </button>
  <a
    v-else-if="renderedTag === 'ANCHOR' && !blank"
    aria-label="Link"
    :href="to"
    role="link"
    v-bind="$attrs"
  >
    <slot></slot>
  </a>
  <a
    v-else-if="renderedTag === 'ANCHOR' && blank"
    aria-label="Link"
    :href="to"
    role="link"
    target="_blank"
    rel="noopener"
    v-bind="$attrs"
  >
    <slot></slot>
  </a>
  <router-link
    v-else
    :to="to"
    v-bind="$attrs"
  >
    <slot></slot>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { RouterLink } from "vue-router"

const props = defineProps({
  to: {
    type: String,
    default: "",
  },
  blank: {
    type: Boolean,
    default: false,
  }
})

const renderedTag = computed(() => {
  if (!props.to) {
    return "BUTTON" as const
  } else if (props.blank) {
    return "ANCHOR" as const
  } else if (/^\/(?!\/).*$/.test(props.to)) {
    // regex101.com/r/LU1iFL/1
    return "FRAMEWORK" as const
  } else {
    return "ANCHOR" as const
  }
})
</script>
