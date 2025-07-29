<template>
  <section class="w-full">
    <div
      class="flex items-center justify-between w-full space-x-3"
      :aria-expanded="isOpen"
      :aria-controls="contentId"
    >
      <slot name="header" :is-open="isOpen" :toggle-accordion="toggleAccordion">
        <div class="flex flex-col text-left w-full">
          <div class="flex items-center justify-between mb-1">
            <span class="font-semibold text-[0.8rem]">
              {{ t(title || '') }}
            </span>
            <HoppSmartToggle
              :on="isOpen"
              @change="toggleAccordion"
              class="ml-2"
            />
          </div>
          <span class="text-tiny text-secondaryLight">
            {{ t(description || '') }}
          </span>
        </div>
      </slot>
    </div>

    <div
      v-show="isOpen"
      :id="contentId"
      role="region"
      :aria-labelledby="headerId"
      class="transition-all duration-300 ease-in-out"
    >
      <slot name="content">
        <div class="mt-2">
          <slot />
        </div>
      </slot>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const props = defineProps<{
  initialOpen?: boolean;
  title?: string; // Optional fallback title
  description?: string; // Optional fallback description
}>();

const emit = defineEmits<{
  (e: 'toggle', value: boolean): void;
}>();

const idSuffix = Math.random().toString(36).substring(2, 9);
const contentId = `accordion-content-${idSuffix}`;
const headerId = `accordion-header-${idSuffix}`;

const isOpen = ref(false);

watch(
  () => props.initialOpen,
  (val) => {
    isOpen.value = val ?? false;
  },
  { immediate: true }
);

const toggleAccordion = () => {
  isOpen.value = !isOpen.value;
  emit('toggle', isOpen.value);
};
</script>
