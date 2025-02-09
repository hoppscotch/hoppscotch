<template>
  <template v-if="'args' in field">
    <GraphqlExplorerSection v-if="field.args.length > 0" title="Arguments">
      <GraphqlArgument
        v-for="arg in field.args"
        :key="arg.name"
        :arg="arg"
        :show-add-button="!readonly"
      />
    </GraphqlExplorerSection>
  </template>
</template>

<script setup lang="ts">
import { GraphQLField } from "graphql"

withDefaults(
  defineProps<{
    field: GraphQLField<any, any>
    readonly?: boolean
  }>(),
  {
    readonly: false,
  }
)
</script>
