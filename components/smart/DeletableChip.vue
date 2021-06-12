<template>
  <span class="chip">
    <span><slot></slot></span>
    <button class="p-2 icon" @click="$emit('chip-delete')">
      <i class="material-icons close-button"> close </i>
    </button>
  </span>
</template>

<style scoped lang="scss">
.chip {
  @apply inline-flex;
  @apply items-center;
  @apply justify-center;
  @apply rounded-lg;
  @apply m-1;
  @apply pl-4;
  @apply bg-primaryDark;
  @apply text-secondary;
  @apply font-mono;
  @apply font-normal;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;
  @apply border;
  @apply border-divider;
}

.close-button {
  @apply text-base;
}
</style>
