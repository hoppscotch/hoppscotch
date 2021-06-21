<template>
  <div :id="`type_${gqlType.name}`" class="p-2 m-2">
    <div
      class="font-bold type-title"
      :class="{ 'type-highlighted': isHighlighted }"
    >
      <span v-if="isInput" class="text-accent">input </span>
      <span v-else-if="isInterface" class="text-accent">interface </span>
      <span v-else-if="isEnum" class="text-accent">enum </span>
      {{ gqlType.name }}
    </div>
    <div v-if="gqlType.description" class="mt-2 text-secondaryLight type-desc">
      {{ gqlType.description }}
    </div>
    <div v-if="interfaces.length > 0" class="mb-2">
      <h5>{{ $t("interfaces") }}</h5>
      <div
        v-for="gqlInterface in interfaces"
        :key="gqlInterface.name"
        class="m-2 ml-4"
      >
        <GraphqlTypeLink
          :gql-type="gqlInterface"
          :jump-type-callback="jumpTypeCallback"
        />
      </div>
    </div>
    <div v-if="children.length > 0" class="mb-2">
      <h5>{{ $t("children") }}</h5>
      <div v-for="child in children" :key="child.name" class="m-2 ml-4">
        <GraphqlTypeLink
          :gql-type="child"
          :jump-type-callback="jumpTypeCallback"
        />
      </div>
    </div>
    <div v-if="gqlType.getFields">
      <h5>{{ $t("fields") }}</h5>
      <div v-for="field in gqlType.getFields()" :key="field.name">
        <GraphqlField
          :gql-field="field"
          :is-highlighted="isFieldHighlighted({ field })"
          :jump-type-callback="jumpTypeCallback"
        />
      </div>
    </div>
    <div v-if="isEnum">
      <h5>{{ $t("values") }}</h5>
      <div
        v-for="value in gqlType.getValues()"
        :key="value.name"
        class="m-4"
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
