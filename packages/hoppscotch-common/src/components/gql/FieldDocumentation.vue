<template>
  <div class="flex flex-col">
    <div class="px-4 py-3">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="text-lg font-semibold text-secondaryDark">
          {{ field.name }}
        </span>
        <span class="text-secondaryLight">:</span>
        <GqlTypeLink :type="field.type" :is-heading="true" />
      </div>
      <AppMarkdown
        v-if="hasDescription"
        type="description"
        class="text-tiny text-secondary leading-snug mt-2"
      >
        {{ description }}
      </AppMarkdown>
    </div>

    <div v-if="deprecationReason" class="bg-yellow-500/10 px-4 py-2">
      <p
        class="text-tiny font-semibold uppercase tracking-wide text-yellow-600"
      >
        {{ t("graphql.deprecated") }}
      </p>
      <AppMarkdown type="deprecation" class="text-tiny text-secondary mt-1">
        {{ deprecationReason }}
      </AppMarkdown>
    </div>

    <GqlArguments :field="field" :readonly="readonly" />
    <GqlFields :type="resolvedType" :show-add-field="!readonly" />
    <GqlDirectives :field="field" />
  </div>
</template>

<script setup lang="ts">
import { GraphQLOutputType, getNamedType } from "graphql"
import { computed, defineProps } from "vue"
import { useI18n } from "~/composables/i18n"

interface Field {
  name: string
  description: string | null
  deprecationReason: string
  type: GraphQLOutputType
}

const props = defineProps<{
  field: Field
  readonly?: boolean
}>()

const t = useI18n()

const hasDescription = computed(() => props.field.description !== null)
const description = computed(() => props.field.description)
const deprecationReason = computed(() => props.field.deprecationReason)

const resolvedType = computed(() => getNamedType(props.field.type))
</script>
