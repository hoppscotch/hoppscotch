<template>
  <div class="fallback">
    <h1>An error occurred</h1>
    <p>{{ errorMessage }}</p>
    <button @click="retry">Retry</button>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{ error: Error }>();

const errorMessage = props.error.message;

function retry() {
  window.location.reload();
}
</script>

<style scoped>
.fallback {
  text-align: center;
  margin-top: 50px;
}
</style>
