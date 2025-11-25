<template>
  <div class="flex items-center space-x-4">
    <img src="/logo.svg" alt="Hoppscotch" class="h-7 w-7" />
    <div class="flex flex-col items-start">
      <h1 class="text-2xl font-semibold text-secondaryDark">Hoppscotch</h1>
      <p class="text-secondary text-sm">
        Desktop {{ mode ? `(${mode})` : "" }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  mode?: string
}

withDefaults(defineProps<Props>(), {
  mode: "",
})
</script>
