<template>
  <template v-if="type">
    <component :is="renderedComponent" />
  </template>
</template>

<script setup lang="ts">
import { GraphQLNamedType, GraphQLType } from "graphql"
import { computed, h } from "vue"
import { renderType, useExplorer } from "~/helpers/graphql/explorer"

const props = defineProps<{
  type: GraphQLType
  clickable?: boolean
  readonly?: boolean
  isHeading?: boolean
}>()

const { push } = useExplorer()

const handleTypeClick = (event: MouseEvent, namedType: GraphQLNamedType) => {
  event.preventDefault()
  push({ name: namedType.name, def: namedType, readonly: props.readonly })
}

/**
 * Generates the rendered HTML for the GraphQL type.
 */
const renderedComponent = computed(() => {
  if (!props.type) return ""

  return renderType(props.type, (namedType: GraphQLNamedType) => {
    return h(
      "span",
      {
        class: `hopp-doc-explorer-type-name ${
          props.isHeading ? "!text-lg !font-bold" : ""
        } 
        ${props.clickable ? "cursor-pointer hover:underline" : ""}  
        `,
        onClick: (event: MouseEvent) =>
          props.clickable ? handleTypeClick(event, namedType) : undefined,
      },
      namedType.name
    )
  })
})
</script>
