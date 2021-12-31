<template>
  <span class="chip">
    <i class="opacity-75 material-icons">attachment</i>
    <span class="px-2 truncate max-w-32"><slot></slot></span>
  </span>
</template>

<style scoped lang="scss">
.chip {
  @apply inline-flex;
  @apply items-center;
  @apply justify-center;
  @apply rounded;
  @apply pl-2;
  @apply pr-0.5;
  @apply bg-transparent;
  @apply border border-divider;
}
</style>
