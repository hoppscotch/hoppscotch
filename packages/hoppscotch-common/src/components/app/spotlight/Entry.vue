<template>
  <button
    ref="el"
    class="flex items-center flex-1 px-6 py-4 font-medium space-x-4 transition cursor-pointer relative search-entry focus:outline-none"
    :class="{ 'active bg-primaryLight text-secondaryDark': active }"
    tabindex="-1"
    @click="emit('action')"
    @keydown.enter="emit('action')"
  >
    <component
      :is="entry.icon"
      class="opacity-50 svg-icons"
      :class="{ 'opacity-100': active }"
    />
    <span
      v-if="entry.text.type === 'text' && typeof entry.text.text === 'string'"
      class="block truncate"
    >
      {{ entry.text.text }}
    </span>
    <span
      v-else-if="entry.text.type === 'text' && Array.isArray(entry.text.text)"
      class="flex items-center flex-1"
    >
      <span
        v-for="(labelPart, labelPartIndex) in entry.text.text"
        :key="`label-${labelPart}-${labelPartIndex}`"
        class="flex items-center space-x-2"
      >
        {{ labelPart }}
        <icon-lucide-chevron-right
          v-if="labelPartIndex < entry.text.text.length - 1"
          class="block truncate"
        />
      </span>
    </span>
    <span
      v-else-if="entry.text.type === 'custom'"
      class="block truncate w-full"
    >
      <component
        :is="entry.text.component"
        v-bind="entry.text.componentProps"
      />
    </span>
    <span v-if="formattedShortcutKeys" class="block truncate">
      <kbd
        v-for="(key, keyIndex) in formattedShortcutKeys"
        :key="`key-${String(keyIndex)}`"
        class="shortcut-key"
      >
        {{ key }}
      </kbd>
    </span>
  </button>
</template>

<script lang="ts">
import { getPlatformSpecialKey } from "~/helpers/platformutils"
import { SpotlightSearcherResult } from "~/services/spotlight"

const SPECIAL_KEY_CHARS: Record<string, string> = {
  ctrl: getPlatformSpecialKey(),
  alt: getPlatformAlternateKey(),
  up: "↑",
  down: "↓",
  enter: "↩",
}
</script>

<script setup lang="ts">
import { computed, watch, ref } from "vue"
import { capitalize } from "lodash-es"
import { getPlatformAlternateKey } from "~/helpers/platformutils"

const el = ref<HTMLElement>()

const props = defineProps<{
  entry: SpotlightSearcherResult
  active: boolean
}>()

const formattedShortcutKeys = computed(() =>
  props.entry.meta?.keyboardShortcut?.map((key) => {
    return SPECIAL_KEY_CHARS[key] ?? capitalize(key)
  })
)

const emit = defineEmits<{
  (e: "action"): void
}>()

watch(
  () => props.active,
  (active) => {
    if (active) {
      el.value?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      })
    }
  }
)
</script>

<style lang="scss" scoped>
.search-entry {
  @apply after:absolute;
  @apply after:top-0;
  @apply after:left-0;
  @apply after:bottom-0;
  @apply after:bg-transparent;
  @apply after:z-2;
  @apply after:w-0.5;
  @apply after:content-DEFAULT;

  &.active {
    @apply after:bg-accentLight;
  }
}
</style>
