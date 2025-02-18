<template>
  <div>
    <GraphqlExplorerSection
      v-if="fields.length > 0"
      :title="t('graphql.fields')"
    >
      <GraphqlField
        v-for="field in fields"
        :key="field.name"
        :field="field"
        :show-add-field="showAddField"
      />
    </GraphqlExplorerSection>
  </div>
</template>

<script setup lang="ts">
import {
  GraphQLNamedType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
} from "graphql"
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { ExplorerFieldDef } from "~/helpers/graphql/explorer"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    type: GraphQLNamedType
    showAddField: boolean
  }>(),
  {
    showAddField: true,
  }
)

const fieldMap = computed(() => {
  if (
    !isObjectType(props.type) &&
    !isInterfaceType(props.type) &&
    !isInputObjectType(props.type)
  ) {
    return {}
  }
  return props.type.getFields()
})

const fields = computed(() => {
  return Object.values(fieldMap.value) as ExplorerFieldDef[]
})
</script>
