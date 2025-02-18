<template>
  <div class="flex flex-col space-y-4">
    <AppMarkdown type="description" class="p-4">
      {{ schemaDescription }}
    </AppMarkdown>

    <GraphqlExplorerSection title="Root Types">
      <div
        v-if="queryType"
        class="hopp-doc-explorer-root-wrapper"
        @click="handleTypeClick(queryType)"
      >
        <span class="hopp-doc-explorer-root-type">
          {{ t("graphql.query") }}
        </span>
        {{ ": " }}
        <GraphqlTypeLink :type="queryType" />
      </div>
      <div
        v-if="mutationType"
        class="hopp-doc-explorer-root-wrapper"
        @click="handleTypeClick(mutationType)"
      >
        <span class="hopp-doc-explorer-root-type">
          {{ t("graphql.mutation") }}
        </span>
        {{ ": " }}
        <GraphqlTypeLink :type="mutationType" />
      </div>
      <div
        v-if="subscriptionType"
        class="hopp-doc-explorer-root-wrapper"
        @click="handleTypeClick(subscriptionType)"
      >
        <span class="hopp-doc-explorer-root-type">
          {{ t("graphql.subscription") }}
        </span>
        {{ ": " }}
        <GraphqlTypeLink :type="subscriptionType" />
      </div>
    </GraphqlExplorerSection>
    <GraphqlExplorerSection title="All Schema Types">
      <div v-if="filteredTypes">
        <div v-for="type in filteredTypes" :key="type.name" class="px-4 py-1">
          <GraphqlTypeLink :type="type" :clickable="true" :readonly="true" />
        </div>
      </div>
    </GraphqlExplorerSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { GraphQLNamedType, GraphQLSchema } from "graphql"
import { useExplorer } from "~/helpers/graphql/explorer"
import { useI18n } from "~/composables/i18n"

const props = defineProps<{
  schema: GraphQLSchema
}>()

const t = useI18n()

const queryType = props.schema.getQueryType()
const mutationType = props.schema.getMutationType?.()
const subscriptionType = props.schema.getSubscriptionType?.()
const typeMap = props.schema.getTypeMap()

const schemaDescription = computed(
  () =>
    props.schema.description ||
    "A GraphQL schema provides a root type for each kind of operation."
)

const { push } = useExplorer()

const handleTypeClick = (namedType: GraphQLNamedType) => {
  push({ name: namedType.name, def: namedType })
}

const ignoreTypesInAllSchema = computed(() => [
  queryType?.name,
  mutationType?.name,
  subscriptionType?.name,
])

const filteredTypes = computed(() => {
  if (!typeMap) return []

  return Object.values(typeMap).filter(
    (type) =>
      !ignoreTypesInAllSchema.value.includes(type.name) &&
      !type.name.startsWith("__")
  )
})
</script>

<style scoped lang="scss">
.hopp-doc-explorer-root-wrapper {
  @apply cursor-pointer flex items-center gap-2 px-4 py-2 transition hover:bg-primaryLight;
}
.hopp-doc-explorer-root-type {
  @apply lowercase text-sm font-normal;
}
</style>
