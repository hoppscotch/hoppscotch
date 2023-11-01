<template>
  <div>
    <div class="field-title" :class="{ 'field-highlighted': isHighlighted }">
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
      class="field-desc py-2 text-secondaryLight"
    >
      {{ gqlField.description }}
    </div>
    <div
      v-if="gqlField.isDeprecated"
      class="field-deprecated my-1 inline-block rounded bg-yellow-200 px-2 py-1 text-black"
    >
      {{ t("state.deprecated") }}
    </div>
    <div v-if="fieldArgs.length > 0">
      <h5 class="my-2">Arguments:</h5>
      <div class="border-l-2 border-divider pl-4">
        <div v-for="(field, index) in fieldArgs" :key="`field-${index}`">
          <span>
            {{ field.name }}:
            <GraphqlTypeLink
              :gql-type="field.type"
              :jump-type-callback="jumpTypeCallback"
            />
          </span>
          <div
            v-if="field.description"
            class="field-desc py-2 text-secondaryLight"
          >
            {{ field.description }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// TypeScript + Script Setup this :)
import { defineComponent } from "vue"
import { useI18n } from "@composables/i18n"

export default defineComponent({
  props: {
    gqlField: { type: Object, default: () => ({}) },
    jumpTypeCallback: { type: Function, default: () => ({}) },
    isHighlighted: { type: Boolean, default: false },
  },
  setup() {
    return {
      t: useI18n(),
    }
  },
  computed: {
    fieldName() {
      return this.gqlField.name
    },

    fieldArgs() {
      return this.gqlField.args || []
    },
  },
})
</script>

<style lang="scss" scoped>
.field-highlighted {
  @apply border-b-2 border-accent;
}

.field-title {
  @apply select-text;
}
</style>
