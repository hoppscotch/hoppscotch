<template>
  <div
    class="flex flex-col justify-between space-y-2 p-5 w-56 h-46 cursor-pointer border-2 rounded-lg shadow transition bg-primaryLight border-primaryDark hover:border-accent"
    :class="{
      '!bg-primary !border-accentDark': selected,
    }"
    @click="$emit('click')"
  >
    <div class="flex flex-col space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[0.9rem] text-secondaryDark">
          {{ t(title) }}
        </span>
        <icon-lucide-check
          v-if="selected"
          class="svg-icons h-4 w-4 text-accent"
        />
      </div>

      <span class="text-secondaryLight w-32">
        {{ t(description) }}
      </span>
    </div>

    <div>
      <div class="flex items-center -space-x-2">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import IconLucideCheck from '~icons/lucide/check';
import { useI18n } from '~/composables/i18n';

defineProps<{
  title: string;
  description: string;
  selected: boolean;
}>();

const emit = defineEmits(['click']);

const t = useI18n();
</script>
