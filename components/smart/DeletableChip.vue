<template>
  <span class="chip">
    <span><slot></slot></span>
    <ButtonSecondary
      class="rounded p-2 close-button icon"
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
  @apply m-1;
  @apply pl-4;
  @apply bg-primaryDark;
  @apply text-secondary;

  @apply border border-divider;
}

.close-button {
  @apply text-base;
}
</style>
