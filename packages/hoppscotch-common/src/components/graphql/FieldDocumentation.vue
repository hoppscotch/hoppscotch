<template>
  <div class="flex flex-col space-y-4">
    <div
      class="hopp-doc-explorer-title p-4 text-xl font-bold break-words flex-wrap flex items-center gap-2 leading-[inherit]"
    >
      {{ field.name }}:
      <GraphqlTypeLink :type="field.type" :is-heading="true" />
    </div>

    <div
      v-if="deprecationReason"
      class="bg-orange-100 border-l-4 border-orange-500 text-orange-700 px-2 py-2"
      role="alert"
    >
      <p class="font-bold uppercase">
        {{ t("graphql.deprecated") }}
      </p>
      <AppMarkdown type="deprecation">
        {{ deprecationReason }}
      </AppMarkdown>
    </div>

    <AppMarkdown v-if="hasDescription" type="description" class="p-4">
      {{ description }}
    </AppMarkdown>
    <!-- <GraphqlExplorerSection title="Type">
      <GraphqlTypeLink :type="field.type" />
    </GraphqlExplorerSection> -->
    <GraphqlArguments :field="field" :readonly="readonly" />
    <GraphqlFields :type="resolvedType" :show-add-field="!readonly" />
    <GraphqlDirectives :field="field" />
  </div>
</template>

<script setup lang="ts">
import { GraphQLOutputType, getNamedType } from "graphql"
import { computed, defineProps } from "vue"
import { useI18n } from "~/composables/i18n"

// Update the Field interface
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

// Computed properties
const hasDescription = computed(() => props.field.description !== null)
const description = computed(() => props.field.description)
const deprecationReason = computed(() => props.field.deprecationReason)

// Add new computed property to resolve the named type
const resolvedType = computed(() => getNamedType(props.field.type))
</script>
