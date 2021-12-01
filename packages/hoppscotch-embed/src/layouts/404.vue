<script setup lang="ts">
const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <main class="text-center py-10 px-4 text-teal-700 dark:text-gray-200">
    <div>
      <p class="text-4xl">
        <carbon-warning class="inline-block" />
      </p>
    </div>
    <router-view />
    <div>
      <button class="m-3 mt-8 text-sm btn" @click="router.back()">
        {{ t("button.back") }}
      </button>
    </div>
  </main>
</template>
