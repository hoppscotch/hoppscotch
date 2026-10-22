<template>
  <div class="flex flex-col">
    <AppMarkdown
      v-if="schemaDescription"
      type="description"
      class="text-secondary leading-relaxed px-4 py-3"
    >
      {{ schemaDescription }}
    </AppMarkdown>

    <GqlExplorerSection title="Root Types">
      <div
        v-if="queryType"
        class="group flex items-center gap-2 cursor-pointer px-4 py-2 transition hover:bg-primaryLight"
        @click="handleTypeClick(queryType)"
      >
        <span class="text-sm font-medium text-accent">
          {{ t("graphql.query") }}
        </span>
        <span class="text-secondaryLight">:</span>
        <GqlTypeLink :type="queryType" />
      </div>
      <div
        v-if="mutationType"
        class="group flex items-center gap-2 cursor-pointer px-4 py-2 transition hover:bg-primaryLight"
        @click="handleTypeClick(mutationType)"
      >
        <span class="text-sm font-medium text-accent">
          {{ t("graphql.mutation") }}
        </span>
        <span class="text-secondaryLight">:</span>
        <GqlTypeLink :type="mutationType" />
      </div>
      <div
        v-if="subscriptionType"
        class="group flex items-center gap-2 cursor-pointer px-4 py-2 transition hover:bg-primaryLight"
        @click="handleTypeClick(subscriptionType)"
      >
        <span class="text-sm font-medium text-accent">
          {{ t("graphql.subscription") }}
        </span>
        <span class="text-secondaryLight">:</span>
        <GqlTypeLink :type="subscriptionType" />
      </div>
    </GqlExplorerSection>

    <GqlExplorerSection title="All Schema Types">
      <div
        v-for="type in filteredTypes"
        :key="type.name"
        class="px-4 py-2 transition hover:bg-primaryLight"
      >
        <GqlTypeLink :type="type" :clickable="true" :readonly="true" />
      </div>
    </GqlExplorerSection>
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

// Derive schema-shape via `computed` so this view tracks `props.schema`
// changes — e.g. when the parent tab's schema is refreshed by polling, or
// the user switches between connected GQL tabs faster than the parent's
// `:key` remount can settle. Capturing these once at setup left the UI
// pinned to the first schema we ever saw.
const queryType = computed(() => props.schema.getQueryType() ?? null)
const mutationType = computed(() => props.schema.getMutationType?.() ?? null)
const subscriptionType = computed(
  () => props.schema.getSubscriptionType?.() ?? null
)
const typeMap = computed(() => props.schema.getTypeMap())

const schemaDescription = computed(() => props.schema.description ?? "")

const { push } = useExplorer()

const handleTypeClick = (namedType: GraphQLNamedType) => {
  push({ name: namedType.name, def: namedType })
}

const ignoreTypesInAllSchema = computed(() => [
  queryType.value?.name,
  mutationType.value?.name,
  subscriptionType.value?.name,
])

const filteredTypes = computed(() => {
  if (!typeMap.value) return []

  return Object.values(typeMap.value).filter(
    (type) =>
      !ignoreTypesInAllSchema.value.includes(type.name) &&
      !type.name.startsWith("__")
  )
})
</script>
