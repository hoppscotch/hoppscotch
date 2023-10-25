<template>
  <div
    class="flex items-center sm:px-16 px-8 justify-start py-6 bg-primaryLight rounded-md shadow-sm h-48 space-x-6"
  >
    <component :is="icon" class="text-5xl" :class="color" />

    <div class="space-y-2">
      <h4 class="text-4xl font-semibold text-accentContrast">
        {{ count }}
      </h4>
      <div class="text-gray-400 font-bold">
        {{ label }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Component } from 'vue';

defineProps<{
  count: number;
  label: string;
  icon: Component;
  color: string;
}>();
</script>
