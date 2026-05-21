<template>
  <section
    v-if="schema"
    :key="activeTabId"
    class="hopp-doc-explorer flex flex-col h-full"
    aria-label="Documentation Explorer"
  >
    <div class="sticky top-0 z-10 bg-primary border-b border-dividerLight">
      <GqlSchemaSearch />
      <nav
        v-if="navStack.length > 1"
        class="flex items-center gap-1 overflow-x-auto whitespace-nowrap px-4 py-2 text-tiny"
        aria-label="Schema explorer breadcrumb"
      >
        <template v-for="(item, index) in navStack" :key="index">
          <button
            v-if="index < navStack.length - 1"
            type="button"
            class="rounded px-1.5 py-0.5 text-secondaryLight transition hover:bg-primaryLight hover:text-secondaryDark"
            @click="navigateToIndex(index)"
          >
            {{ item.name }}
          </button>
          <span v-else class="rounded px-1.5 py-0.5 font-semibold text-accent">
            {{ item.name }}
          </span>
          <icon-lucide-chevron-right
            v-if="index < navStack.length - 1"
            class="svg-icons text-secondaryLight flex-shrink-0"
          />
        </template>
      </nav>
    </div>

    <div class="hopp-doc-explorer-content flex flex-col flex-1 overflow-y-auto">
      <template v-if="navStack.length === 1">
        <GqlSchemaDocumentation :schema="schema" />
      </template>
      <template v-else-if="isType(currentNavItem.def)">
        <div class="px-4 py-3 bg-primary sticky top-0 z-[6]">
          <h2
            class="text-lg font-semibold text-secondaryDark break-words flex items-center gap-2"
          >
            <icon-lucide-box class="svg-icons text-accent flex-shrink-0" />
            {{ currentNavItem.name }}
          </h2>
        </div>
        <GqlTypeDocumentation
          :type="currentNavItem.def"
          :readonly="currentNavItem.readonly"
        />
      </template>
      <template v-else-if="currentNavItem.def">
        <GqlFieldDocumentation
          :field="currentNavItem.def"
          :readonly="currentNavItem.readonly"
        />
      </template>
    </div>
  </section>

  <HoppSmartPlaceholder
    v-else
    :src="`/images/states/${colorMode.value}/pack.svg`"
    :alt="t('empty.empty_schema')"
    :text="t('empty.empty_schema')"
  >
  </HoppSmartPlaceholder>
</template>

<script setup lang="ts">
import { isType } from "graphql"
import { useExplorer } from "~/helpers/graphql/explorer"
import { useColorMode } from "~/composables/theming"
import { useI18n } from "~/composables/i18n"
import { useService } from "dioc/vue"
import { GQLTabConnectionService } from "~/services/gql-tab-connection.service"

const colorMode = useColorMode()
const t = useI18n()

const gqlTabConn = useService(GQLTabConnectionService)

const schema = gqlTabConn.activeTabSchema

// Key the section on the active tab ID so the entire subtree
// (SchemaDocumentation, SchemaSearch, etc.) is recreated on tab switch.
// This is necessary because child components store schema-derived values
// in non-reactive local variables at setup time.
const activeTabId = gqlTabConn.activeGQLTabId

const { navStack, currentNavItem, navigateToIndex } = useExplorer()
</script>

<style lang="scss">
.hopp-doc-explorer-field-name {
  color: var(--editor-name-color);
}
.hopp-doc-explorer-type-name {
  color: var(--editor-type-color);
  @apply text-sm font-normal transition hover:text-accent;
}
.hopp-doc-explorer-argument-name {
  color: var(--editor-keyword-color);
}
.hopp-doc-explorer-default-value {
  color: var(--editor-string-color);
  @apply text-sm;
}
</style>
