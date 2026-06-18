<template>
  <template v-if="inline">
    <span
      class="hopp-doc-explorer-argument inline-flex items-center gap-1 cursor-pointer hover:text-accent transition"
      tabindex="0"
      @click="handleClick"
      @keydown="handleKeydown"
    >
      <span class="hopp-doc-explorer-argument-name">{{ arg.name }}</span>
      <span class="text-secondaryLight">:</span>
      <GqlTypeLink :type="arg.type" />
      <GqlDefaultValue v-if="showDefaultValue !== false" :field="arg" />
    </span>
  </template>

  <div
    v-else
    class="group flex items-center gap-1 px-4 py-2 transition hover:bg-primaryLight cursor-pointer"
    :class="{ 'line-through opacity-60': arg.deprecationReason }"
    tabindex="0"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <div class="flex flex-1 min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
      <button
        v-if="showAddButton"
        class="flex items-center justify-center rounded transition hover:text-accent"
        :class="{
          'text-accent': queryBuilder.isArgumentInOperation(arg),
          'text-secondaryLight': !queryBuilder.isArgumentInOperation(arg),
        }"
        type="button"
        @click.stop="insertQuery"
      >
        <icon-lucide-plus-circle
          v-if="!queryBuilder.isArgumentInOperation(arg)"
          class="svg-icons"
        />
        <icon-lucide-circle-check v-else class="svg-icons" />
      </button>
      <span class="hopp-doc-explorer-argument-name text-sm font-medium">
        {{ arg.name }}
      </span>
      <span class="text-secondaryLight">:</span>
      <GqlTypeLink :type="arg.type" />
      <GqlDefaultValue v-if="showDefaultValue !== false" :field="arg" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from "vue"
import type { GraphQLArgument } from "graphql"
import { debounce } from "lodash-es"
import { useExplorer } from "~/helpers/graphql/explorer"
import { useService } from "dioc/vue"
import { GQLQueryBuilderService } from "~/services/gql-query-builder.service"

const queryBuilder = useService(GQLQueryBuilderService)

interface ArgumentProps {
  arg: GraphQLArgument
  showDefaultValue?: boolean
  inline?: boolean
  showAddButton?: boolean
}

const props = withDefaults(defineProps<ArgumentProps>(), {
  showDefaultValue: false,
  inline: false,
  showAddButton: false,
})

const { push } = useExplorer()

const handleClick = () => {
  push({ name: props.arg.name, def: props.arg })
}

// The span/div act as buttons (tabindex=0 + click), so mirror the click for
// keyboard users — Enter and Space activate, with Space's default page scroll
// suppressed. A `role="button"` is intentionally NOT added: these elements wrap
// interactive children (the add button and clickable type links), which a
// button role disallows.
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    handleClick()
  }
}

const insertQuery = debounce(() => {
  queryBuilder.handleAddArgument(props.arg)
}, 50)

// Cancel any pending debounced insert on unmount (docs explorer closing /
// navigation) so it can't write to the long-lived query-builder service after
// the component is gone.
onBeforeUnmount(() => {
  insertQuery.cancel()
})
</script>
