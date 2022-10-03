<template>
  <div :id="`type_${gqlType.name}`" class="p-4">
    <div class="type-title" :class="{ 'text-accent': isHighlighted }">
      <span v-if="isInput" class="text-accent">input </span>
      <span v-else-if="isInterface" class="text-accent">interface </span>
      <span v-else-if="isEnum" class="text-accent">enum </span>
      {{ gqlType.name }}
    </div>
    <div v-if="gqlType.description" class="py-2 text-secondaryLight type-desc">
      {{ gqlType.description }}
    </div>
    <div v-if="interfaces.length > 0">
      <h5 class="my-2">Interfaces:</h5>
      <div
        v-for="(gqlInterface, index) in interfaces"
        :key="`gqlInterface-${index}`"
      >
        <GraphqlTypeLink
          :gql-type="gqlInterface"
          :jump-type-callback="jumpTypeCallback"
          class="pl-4 border-l-2 border-divider"
        />
      </div>
    </div>
    <div v-if="children.length > 0" class="mb-2">
      <h5 class="my-2">Children:</h5>
      <GraphqlTypeLink
        v-for="(child, index) in children"
        :key="`child-${index}`"
        :gql-type="child"
        :jump-type-callback="jumpTypeCallback"
        class="pl-4 border-l-2 border-divider"
      />
    </div>
    <div v-if="gqlType.getFields">
      <h5 class="my-2">Fields:</h5>
      <GraphqlField
        v-for="(field, index) in gqlType.getFields()"
        :key="`field-${index}`"
        class="pl-4 border-l-2 border-divider"
        :gql-field="field"
        :is-highlighted="isFieldHighlighted({ field })"
        :jump-type-callback="jumpTypeCallback"
      />
    </div>
    <div v-if="isEnum">
      <h5 class="my-2">Values:</h5>
      <div
        v-for="(value, index) in gqlType.getValues()"
        :key="`value-${index}`"
        class="pl-4 border-l-2 border-divider"
        v-text="value.name"
      ></div>
    </div>
  </div>
</template>

<script>
// TODO: TypeScript + Setup Script this at some point :)

import { defineComponent } from "vue"
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
} from "graphql"

export default defineComponent({
  props: {
    // eslint-disable-next-line vue/require-default-prop, vue/require-prop-types
    gqlType: {},
    gqlTypes: { type: Array, default: () => [] },
    jumpTypeCallback: { type: Function, default: () => ({}) },
    isHighlighted: { type: Boolean, default: false },
    highlightedFields: { type: Array, default: () => [] },
  },
  computed: {
    isInput() {
      return this.gqlType instanceof GraphQLInputObjectType
    },
    isInterface() {
      return this.gqlType instanceof GraphQLInterfaceType
    },
    isEnum() {
      return this.gqlType instanceof GraphQLEnumType
    },
    interfaces() {
      return (this.gqlType.getInterfaces && this.gqlType.getInterfaces()) || []
    },
    children() {
      return this.gqlTypes.filter(
        (type) =>
          type.getInterfaces && type.getInterfaces().includes(this.gqlType)
      )
    },
  },
  methods: {
    isFieldHighlighted({ field }) {
      return !!this.highlightedFields.find(({ name }) => name === field.name)
    },
  },
})
</script>

<style lang="scss" scoped>
.type-highlighted {
  @apply text-accent;
}
</style>
