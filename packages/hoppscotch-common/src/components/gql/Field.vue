<template>
  <div
    class="group flex items-start gap-1 px-4 py-2 transition hover:bg-primaryLight cursor-pointer"
    @click="handleClick"
  >
    <div
      class="flex flex-1 min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1"
      :class="{ 'line-through opacity-60': field.deprecationReason }"
    >
      <GqlFieldLink
        :field="field"
        :show-add-field="showAddField"
        :is-added="queryBuilder.isFieldInOperation(field)"
        @add-field="insertQuery"
      />
      <template v-if="args.length > 0">
        <span class="text-secondaryLight">(...)</span>
      </template>
      <span class="text-secondaryLight">:</span>
      <GqlTypeLink :type="field.type" />
      <GqlDefaultValue :field="field" />
    </div>

    <span
      v-if="field.deprecationReason"
      v-tippy="{ theme: 'tooltip' }"
      class="flex flex-shrink-0 items-center justify-center text-yellow-500 mt-0.5"
      :title="field.deprecationReason"
    >
      <icon-lucide-triangle-alert class="svg-icons" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { ExplorerFieldDef, useExplorer } from "~/helpers/graphql/explorer"
import { useService } from "dioc/vue"
import { GQLQueryBuilderService } from "~/services/gql-query-builder.service"

const props = withDefaults(
  defineProps<{
    field: ExplorerFieldDef
    showAddField: boolean
  }>(),
  {
    showAddField: true,
  }
)

const { push } = useExplorer()
const queryBuilder = useService(GQLQueryBuilderService)

const handleClick = () => {
  push({ name: props.field.name, def: props.field })
}

const insertQuery = () => {
  queryBuilder.handleAddField(props.field)
}

const args = computed(() =>
  "args" in props.field
    ? props.field.args.filter((arg) => !arg.deprecationReason)
    : []
)
</script>
