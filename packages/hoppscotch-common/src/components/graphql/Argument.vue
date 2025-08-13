<template>
  <template v-if="inline">
    <span class="hopp-doc-explorer-argument" tabindex="0" @click="handleClick">
      <span class="hopp-doc-explorer-argument-name"> {{ arg.name }} </span>:
      <GraphqlTypeLink :type="arg.type" />
      <GraphqlDefaultValue v-if="showDefaultValue !== false" :field="arg" />
    </span>
  </template>

  <div
    v-else
    class="hopp-doc-explorer-argument"
    tabindex="0"
    @click="handleClick"
  >
    <div class="inline-flex items-center align-bottom">
      <span
        v-if="showAddButton"
        class="hover:text-accent cursor-pointer flex items-center justify-center px-4 py-2"
        :class="{ 'text-accent': isArgumentInOperation(arg) }"
        @click="insertQuery"
      >
        <icon-lucide-plus-circle
          v-if="!isArgumentInOperation(arg)"
          class="svg-icons"
        />
        <icon-lucide-circle-check v-else class="svg-icons" />
      </span>
      <div class="flex items-center gap-2">
        <span class="hopp-doc-explorer-argument-name text-sm py-2 font-normal">
          {{ arg.name }}
        </span>
        :
        <GraphqlTypeLink :type="arg.type" />
        <GraphqlDefaultValue v-if="showDefaultValue !== false" :field="arg" />
      </div>
    </div>

    <!-- <AppMarkdown v-if="arg.description" type="description">
      {{ arg.description }}
    </AppMarkdown> -->

    <div
      v-if="arg.deprecationReason"
      class="hopp-doc-explorer-argument-deprecation"
    >
      <div class="hopp-doc-explorer-argument-deprecation-label">Deprecated</div>

      <AppMarkdown type="deprecationReason">
        {{ arg.deprecationReason }}
      </AppMarkdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GraphQLArgument } from "graphql"
import { useQuery } from "~/helpers/graphql/query"
import { debounce } from "lodash-es"
import { useExplorer } from "~/helpers/graphql/explorer"

const { handleAddArgument, isArgumentInOperation } = useQuery()

interface ArgumentProps {
  /**
   * The argument that should be rendered.
   */
  arg: GraphQLArgument
  /**
   * Toggle if the default value for the argument is shown (if there is one)
   * @default false
   */
  showDefaultValue?: boolean
  /**
   * Toggle whether to render the whole argument including description and
   * deprecation reason (`false`) or to just render the argument name, type,
   * and default value in a single line (`true`).
   * @default false
   */
  inline?: boolean

  /**
   * Whether to show the add button or not
   */
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

const insertQuery = debounce(() => {
  handleAddArgument(props.arg)
}, 50)
</script>

<style scoped lang="scss">
.hopp-doc-explorer-argument {
  @apply transition hover:bg-primaryLight;
  cursor: pointer;
}
</style>
