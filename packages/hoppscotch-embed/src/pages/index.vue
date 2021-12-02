<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <h1 class="font-semibold text-secondaryDark text-2xl">
      {{ t("app.title") }}
    </h1>
    <p class="mt-2 text-secondaryLight">
      {{ t("app.description") }}
    </p>
  </div>
</template>
