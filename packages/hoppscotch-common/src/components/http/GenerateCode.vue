<template>
  <AppPaneLayout force-column-layout>
    <template #primary>
      <div class="h-full">
        <div
          class="flex items-center overflow-x-auto whitespace-nowrap px-4 py-2 text-tiny text-secondaryLight sticky top-0 border-b border-dividerLight"
        >
          <span class="truncate"> {{ t("request.title") }} </span>
          <icon-lucide-chevron-right class="mx-2" />
          Code snippet
        </div>

        <HttpCodegen :hide-label="true" class="px-4 mt-4" v-if="show" />
      </div>
    </template>

    <template #secondary>
      <div class="relative">
        <div
          class="flex items-center overflow-x-auto whitespace-nowrap px-4 py-2 text-tiny text-secondaryLight sticky top-0 border-b border-dividerLight"
        >
          <span class="truncate"> {{ t("response.title") }} </span>
          <icon-lucide-chevron-right class="mx-2" />
          Inteface type
        </div>

        <HttpResponseInterface v-if="show" />
      </div>
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps<{
  show: boolean
}>()
</script>
