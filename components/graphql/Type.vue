<template>
  <div :id="`type_${gqlType.name}`" class="p-4">
    <div
      class="font-semibold text-xs type-title"
      :class="{ 'text-accent': isHighlighted }"
    >
      <span v-if="isInput" class="text-accent">input </span>
      <span v-else-if="isInterface" class="text-accent">interface </span>
      <span v-else-if="isEnum" class="text-accent">enum </span>
      {{ gqlType.name }}
    </div>
    <div
      v-if="gqlType.description"
      class="py-2 text-xs text-secondaryLight type-desc"
    >
      {{ gqlType.description }}
    </div>
    <div v-if="interfaces.length > 0">
      <h5 class="my-2 text-xs">Interfaces:</h5>
      <div v-for="gqlInterface in interfaces" :key="gqlInterface.name">
        <GraphqlTypeLink
          :gql-type="gqlInterface"
          :jump-type-callback="jumpTypeCallback"
          class="pl-4 border-l-2 border-divider"
        />
      </div>
    </div>
    <div v-if="children.length > 0" class="mb-2">
      <h5 class="my-2 text-xs">Children:</h5>
      <GraphqlTypeLink
        v-for="child in children"
        :key="child.name"
        :gql-type="child"
        :jump-type-callback="jumpTypeCallback"
        class="pl-4 border-l-2 border-divider"
      />
    </div>
    <div v-if="gqlType.getFields">
      <h5 class="my-2 text-xs">Fields:</h5>
      <GraphqlField
        v-for="field in gqlType.getFields()"
        :key="field.name"
        class="pl-4 border-l-2 border-divider"
        :gql-field="field"
        :is-highlighted="isFieldHighlighted({ field })"
        :jump-type-callback="jumpTypeCallback"
      />
    </div>
    <div v-if="isEnum">
      <h5 class="my-2 text-xs">Values:</h5>
      <div
        v-for="value in gqlType.getValues()"
        :key="value.name"
        class="pl-4 border-l-2 border-divider"
        v-text="value.name"
      ></div>
    </div>
  </div>
</template>

<script>
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
} from "graphql"

export default {
  props: {
    // eslint-disable-next-line vue/require-default-prop, vue/require-prop-types
    gqlType: {},
    gqlTypes: { type: Array, default: () => [] },
    jumpTypeCallback: { type: Function, default: () => {} },
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
}
</script>

<style scoped lang="scss">
.type-highlighted {
  @apply text-accent;
}
</style>
