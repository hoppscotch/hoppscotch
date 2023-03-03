<template>
  <div
    :class="`fixed bottom-0 right-0 mb-4 mr-4 bg-zinc-500 text-gray-800 px-6 py-3 rounded-md z-50 transition-opacity duration-300 ${
      state.isVisible ? 'opacity-100' : 'opacity-0'
    }`"
    @click="close"
  >
    {{ message }}
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

defineProps({
  message: {
    type: String,
    required: true,
  },
});
const state = reactive({
  isVisible: true,
});

const close = () => {
  state.isVisible = false;
};
</script>
