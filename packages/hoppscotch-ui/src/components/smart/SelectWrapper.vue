<template>
  <div class="select-wrapper">
    <span class="down-icon text-xs">
      <IconChevronDown />
    </span>
    <slot />
  </div>
</template>

<script setup lang="ts">
import IconChevronDown from '~icons/lucide/chevron-down'
</script>

<style scoped lang="scss">
.select-wrapper {
  @apply flex flex-1;
  @apply relative;
}

.down-icon {
  @apply absolute;
  @apply flex;
  @apply inset-y-0;
  @apply items-center;
  @apply justify-center;
  @apply pointer-events-none;
  @apply text-current;
  @apply right-3;
}
</style>
