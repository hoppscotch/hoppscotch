<template>
  <div
    class="
      cursor-pointer
      flex
      py-2
      px-6
      transition
      items-center
      group
      hover:bg-primaryLight
      focus:outline-none
      focus-visible:bg-primaryLight
      search-entry
    "
    :class="{ active, 'outline-none': active, 'focus-visible': active }"
    tabindex="0"
    @click="$emit('action', shortcut.action)"
    @keydown.enter="$emit('action', shortcut.action)"
  >
    <SmartIcon
      class="
        mr-4
        opacity-50
        transition
        svg-icons
        group-hover:text-secondaryDark group-hover:opacity-100
        group-focus:opacity-100
      "
      :class="{ 'opacity-100': active, 'text-secondaryDark': active }"
      :name="shortcut.icon"
    />
    <span
      class="
        flex flex-1
        mr-4
        transition
        group-hover:text-secondaryDark
        group-focus:text-secondaryDark
      "
      :class="{ 'text-secondaryDark': active }"
    >
      {{ $t(shortcut.label) }}
    </span>
    <span
      v-for="(key, keyIndex) in shortcut.keys"
      :key="`key-${String(keyIndex)}`"
      class="shortcut-key"
    >
      {{ key }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  shortcut: Object
  active: Boolean
}>()
</script>

<style lang="scss" scoped>
.search-entry {
  @apply relative;

  &::after {
    @apply absolute;
    @apply top-0;
    @apply left-0;
    @apply bottom-0;
    @apply bg-transparent;
    @apply z-2;
    @apply w-0.5;
    @apply transition;

    content: "";
  }

  &:hover::after,
  &:focus::after,
  &.active::after {
    @apply bg-accentLight;
  }
}

.shortcut-key {
  @apply bg-dividerLight;
  @apply rounded;
  @apply ml-2;
  @apply py-1;
  @apply px-2;
  @apply inline-flex;
}
</style>
