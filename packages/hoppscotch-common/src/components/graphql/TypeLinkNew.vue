<template>
  <template v-if="type">
    <component :is="renderType(type, renderNamedType)" />
  </template>
</template>

<script setup lang="ts">
import type { GraphQLNamedType, GraphQLType } from "graphql"
import { h } from "vue"
import { useExplorer, renderType } from "../../helpers/graphql/explorer"

interface TypeLinkProps {
  type: GraphQLType
  schema: any
}

const props = defineProps<TypeLinkProps>()

// Use the explorer composable
const { push } = useExplorer(props.schema)

const renderNamedType = (namedType: GraphQLNamedType) => {
  const handleClick = (event: MouseEvent) => {
    event.preventDefault()
    push({
      name: namedType.name,
      def: namedType,
    })
  }

  return h(
    "span",
    {
      class: "graphiql-doc-explorer-type-name",
      style: {
        color: "hsl(30,100%,80%)",
        cursor: "pointer",
      },
      onClick: handleClick,
    },
    namedType.name
  )
}
</script>
