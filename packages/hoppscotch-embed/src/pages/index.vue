<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <h1 class="font-semibold text-2xl">
      {{ t("app.title") }}
    </h1>
    <p class="mt-2 text-gray-400 dark:text-gray-500">
      {{ t("app.description") }}
    </p>
  </div>
</template>
