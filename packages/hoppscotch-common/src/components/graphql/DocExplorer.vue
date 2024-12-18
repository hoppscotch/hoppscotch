<template>
  <section class="graphiql-doc-explorer" aria-label="Documentation Explorer">
    <div class="graphiql-doc-explorer-header">
      <div class="graphiql-doc-explorer-header-content">
        <a
          v-if="prevName"
          href="#"
          class="graphiql-doc-explorer-back"
          @click.prevent="pop"
          :aria-label="`Go back to ${prevName}`"
        >
          <icon-lucide-chevron-left />
          {{ prevName }}
        </a>
        <div class="graphiql-doc-explorer-title">
          {{ currentNavItem.name }}
        </div>
      </div>
      <!-- TODO: implement search -->
      <!-- <Search :key="currentNavItem.name" /> -->
    </div>
    <div class="graphiql-doc-explorer-content">
      <!-- <template v-if="fetchError">
        <div class="graphiql-doc-explorer-error">Error fetching schema</div>
      </template>
      <template v-else-if="validationErrors.length > 0">
        <div class="graphiql-doc-explorer-error">
          Schema is invalid: {{ validationErrors[0].message }}
        </div>
      </template>
      <template v-else-if="isFetching">
        <Spinner />
      </template>
      <template v-else-if="!schema">
        <div class="graphiql-doc-explorer-error">
          No GraphQL schema available
        </div>
      </template> -->
      <template v-if="navStack.length === 1 && schema">
        <GraphqlSchemaBrowser :schema="schema" />
      </template>
      <!-- <template v-else-if="isType(currentNavItem.def)">
        <TypeDocumentation :type="currentNavItem.def" />
      </template>
      <template v-else-if="currentNavItem.def">
        <FieldDocumentation :field="currentNavItem.def" />
      </template> -->
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue"
// import { isType } from "graphql"
import { useExplorer } from "./context"
import { schema } from "~/helpers/graphql/connection"

// Use explorer composable
const { navStack, currentNavItem, pop } = useExplorer()

// Compute previous name if navigation stack has more than one item
const prevName = computed(() => {
  return navStack.value.length > 1
    ? navStack.value[navStack.value.length - 2].name
    : undefined
})
</script>
