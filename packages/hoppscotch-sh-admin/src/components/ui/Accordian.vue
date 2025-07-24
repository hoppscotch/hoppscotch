<template>
  <div>
    <div
      class="flex items-center space-x-3"
      :aria-expanded="isOpen"
      :aria-controls="UID"
    >
      <slot
        name="header"
        :is-open="isOpen"
        :toggle-accordian="toggleAccordion"
      />
    </div>

    <div v-show="isOpen" :aria-labelledby="UID" :id="UID">
      <slot name="content" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

const UID = 'accordian-' + Math.random().toString(36).substr(2, 9);

const props = defineProps<{
  initialOpen?: boolean;
}>();

const isOpen = ref(false);

watch(
  () => props.initialOpen,
  (newVal) => {
    isOpen.value = newVal ?? false;
  },
  { immediate: true }
);

const toggleAccordion = () => {
  isOpen.value = !isOpen.value;
};
</script>
