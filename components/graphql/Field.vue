<template>
  <div>
    <div
      class="font-semibold text-xs field-title"
      :class="{ 'field-highlighted': isHighlighted }"
    >
      {{ fieldName }}
      <span v-if="fieldArgs.length > 0">
        (
        <span v-for="(field, index) in fieldArgs" :key="`field-${index}`">
          {{ field.name }}:
          <GraphqlTypeLink
            :gql-type="field.type"
            :jump-type-callback="jumpTypeCallback"
          />
          <span v-if="index !== fieldArgs.length - 1">, </span>
        </span>
        ) </span
      >:
      <GraphqlTypeLink
        :gql-type="gqlField.type"
        :jump-type-callback="jumpTypeCallback"
      />
    </div>
    <div
      v-if="gqlField.description"
      class="text-xs text-secondaryLight py-2 field-desc"
    >
      {{ gqlField.description }}
    </div>
    <div
      v-if="gqlField.isDeprecated"
      class="
        rounded
        font-semibold
        bg-yellow-200
        my-1
        text-xs text-black
        py-1
        px-2
        inline-block
        field-deprecated
      "
    >
      {{ $t("deprecated") }}
    </div>
    <div v-if="fieldArgs.length > 0">
      <h5 class="my-2 text-xs">Arguments:</h5>
      <div class="border-divider border-l-2 pl-4">
        <div v-for="(field, index) in fieldArgs" :key="`field-${index}`">
          <span class="font-semibold text-xs">
            {{ field.name }}:
            <GraphqlTypeLink
              :gql-type="field.type"
              :jump-type-callback="jumpTypeCallback"
            />
          </span>
          <div
            v-if="field.description"
            class="text-xs text-secondaryLight py-2 field-desc"
          >
            {{ field.description }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    gqlField: { type: Object, default: () => {} },
    jumpTypeCallback: { type: Function, default: () => {} },
    isHighlighted: { type: Boolean, default: false },
  },
  computed: {
    fieldName() {
      return this.gqlField.name
    },

    fieldArgs() {
      return this.gqlField.args || []
    },
  },
}
</script>

<style scoped lang="scss">
.field-highlighted {
  @apply border-b-2 border-accent;
}
</style>
