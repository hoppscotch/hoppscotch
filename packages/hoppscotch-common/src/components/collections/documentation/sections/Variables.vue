<template>
  <div v-if="hasItems(variables)" class="max-w-2xl space-y-2">
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      <span>{{ title }}</span>
    </h2>
    <div class="px-4 py-2 flex flex-col">
      <div class="space-y-3">
        <div
          v-for="(variable, index) in variables"
          :key="index"
          class="flex items-center space-x-4"
        >
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              variable.key
            }}</span>
            <span class="px-1">{{ getVariableValue(variable) }}</span>
          </div>
          <div v-if="'active' in variable" class="flex items-center">
            <span
              class="px-2 py-0.5 text-xs rounded"
              :class="
                variable.active
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
              "
            >
              {{
                variable.active ? t("documentation.yes") : t("documentation.no")
              }}
            </span>
          </div>
        </div>
        <div
          v-if="variables.length === 0"
          class="text-secondaryLight text-sm py-1"
        >
          {{ t("documentation.variables.no_vars") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  HoppRESTRequestVariable,
  HoppCollectionVariable,
} from "@hoppscotch/data"
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const props = defineProps<{
  variables: (HoppRESTRequestVariable | HoppCollectionVariable)[]
  title?: string
}>()

const title = computed(() => props.title || t("documentation.variables.title"))

function hasItems<T>(value: T[] | undefined): boolean {
  return !!value && value.length > 0
}

function getVariableValue(
  variable: HoppRESTRequestVariable | HoppCollectionVariable
): string {
  if ("value" in variable) {
    // Request variable
    return variable.value
  } else if ("secret" in variable && variable.secret) {
    // Collection variable (secret)
    return "••••••••"
  } else if ("initialValue" in variable) {
    // Collection variable (not secret)
    return variable.initialValue
  }
  return ""
}
</script>
