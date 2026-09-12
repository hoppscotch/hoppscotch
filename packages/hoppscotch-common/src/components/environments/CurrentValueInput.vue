<template>
  <input
    v-model="currentValue"
    type="text"
    class="min-w-[4rem] w-full truncate rounded bg-transparent text-secondaryLight focus:outline-none focus:ring-1 focus:ring-dividerDark"
    :placeholder="t('environment.edit_current_value')"
    :aria-label="t('environment.edit_current_value')"
    :name="name"
  />
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { CurrentValueService } from "~/services/current-environment-value.service"

const props = defineProps<{
  envId: string
  varIndex: number
  variableKey: string
  name?: string
}>()

const t = useI18n()
const currentEnvironmentValueService = useService(CurrentValueService)

/**
 * Read/write `CurrentValueService` directly so the cell never keeps local
 * shadow state and always reflects the value the next request will resolve.
 * The variable's key is only consulted when the environment has no entry on
 * this device yet (the service's cleanup watcher drops keyless entries).
 */
const currentValue = computed({
  get: () =>
    currentEnvironmentValueService.getEnvironmentVariableValue(
      props.envId,
      props.varIndex
    ) ?? "",
  set: (value: string) => {
    if (!props.envId) return

    currentEnvironmentValueService.setEnvironmentVariableValue(
      props.envId,
      props.varIndex,
      value,
      props.variableKey
    )
  },
})
</script>
