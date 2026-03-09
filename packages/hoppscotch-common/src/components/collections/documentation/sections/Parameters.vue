<template>
  <div v-if="hasItems(params)" class="max-w-2xl space-y-2">
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      <span>{{ t("documentation.parameters.title") }}</span>
    </h2>
    <div class="px-4 py-2 flex flex-col">
      <div class="space-y-3">
        <div
          v-for="(param, index) in params"
          :key="index"
          class="flex items-center space-x-4"
        >
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              param.key
            }}</span>
            <span class="px-1 w-32">{{ param.value }}</span>
            <span
              v-if="param.description"
              class="px-1 w-56 text-xs text-secondaryLight"
            >
              {{ param.description }}
            </span>
          </div>
          <div class="flex items-center">
            <span
              class="px-2 py-0.5 text-xs rounded"
              :class="
                param.active
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
              "
            >
              {{
                param.active ? t("documentation.yes") : t("documentation.no")
              }}
            </span>
          </div>
        </div>
        <div
          v-if="params.length === 0"
          class="text-secondaryLight text-sm py-1"
        >
          {{ t("documentation.parameters.no_params") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HoppRESTParam } from "@hoppscotch/data"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

defineProps<{
  params: HoppRESTParam[]
}>()

function hasItems<T>(value: T[] | undefined): boolean {
  return !!value && value.length > 0
}
</script>
