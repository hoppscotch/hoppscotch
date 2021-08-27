<template>
  <span class="chip">
    <i class="opacity-75 material-icons">attachment</i>
    <span class="max-w-64 px-2 truncate"><slot></slot></span>
    <ButtonSecondary
      class="rounded close-button"
      icon="close"
      @click.native="$emit('chip-delete')"
    />
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

.close-button {
  @apply p-0.5;
}
</style>
