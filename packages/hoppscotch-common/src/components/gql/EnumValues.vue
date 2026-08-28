<template>
  <template v-if="isEnumType(type)">
    <GqlExplorerSection v-if="enumValues.values.length > 0" title="Enum Values">
      <div
        v-for="value in enumValues.values"
        :key="value.name"
        class="px-4 py-2"
      >
        <div class="text-sm font-medium text-secondaryDark">
          {{ value.name }}
        </div>
        <AppMarkdown
          v-if="value.description"
          type="description"
          class="text-tiny text-secondary leading-snug mt-1"
        >
          {{ value.description }}
        </AppMarkdown>
      </div>
    </GqlExplorerSection>

    <template v-if="enumValues.deprecatedValues.length > 0">
      <GqlExplorerSection
        v-if="showDeprecated || enumValues.values.length === 0"
        title="Deprecated Enum Values"
      >
        <div
          v-for="value in enumValues.deprecatedValues"
          :key="value.name"
          class="px-4 py-2"
        >
          <div class="text-sm font-medium text-secondaryDark line-through">
            {{ value.name }}
          </div>
          <AppMarkdown
            v-if="value.deprecationReason"
            type="deprecation"
            class="text-tiny text-secondary leading-snug mt-1"
          >
            {{ value.deprecationReason }}
          </AppMarkdown>
        </div>
      </GqlExplorerSection>

      <button
        v-else
        type="button"
        class="text-tiny font-semibold uppercase tracking-wide text-accent hover:underline px-4 py-2 text-left"
        @click="handleShowDeprecated"
      >
        {{ t("graphql.show_depricated_values") }}
      </button>
    </template>
  </template>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import type { GraphQLNamedType, GraphQLEnumValue } from "graphql"
import { isEnumType } from "graphql"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

interface EnumValuesProps {
  type: GraphQLNamedType
}

const props = defineProps<EnumValuesProps>()

const showDeprecated = ref(false)

const handleShowDeprecated = () => {
  showDeprecated.value = true
}

const enumValues = computed(() => {
  if (!isEnumType(props.type)) {
    return { values: [], deprecatedValues: [] }
  }

  const values: GraphQLEnumValue[] = []
  const deprecatedValues: GraphQLEnumValue[] = []

  for (const value of props.type.getValues()) {
    if (value.deprecationReason) {
      deprecatedValues.push(value)
    } else {
      values.push(value)
    }
  }

  return { values, deprecatedValues }
})
</script>
