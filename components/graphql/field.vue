<template>
  <div class="p-2 m-2 border-b border-dashed border-brdColor">
    <div class="field-title">
      {{ fieldName }}
      <span v-if="fieldArgs.length > 0">
        (
        <span v-for="(field, index) in fieldArgs" :key="index">
          {{ field.name }}:
          <typelink :gqlType="field.type" :jumpTypeCallback="jumpTypeCallback" />
          <span v-if="index !== fieldArgs.length - 1"> , </span>
        </span>
        ) </span
      >:
      <typelink :gqlType="gqlField.type" :jumpTypeCallback="jumpTypeCallback" />
    </div>
    <div class="mt-2 text-fgLightColor field-desc" v-if="gqlField.description">
      {{ gqlField.description }}
    </div>
    <div
      class="inline-block px-4 py-2 my-2 text-sm font-bold text-black bg-yellow-200 rounded-lg field-deprecated"
      v-if="gqlField.isDeprecated"
    >
      {{ $t("deprecated") }}
    </div>
  </div>
</template>

<script>
export default {
  props: {
    gqlField: Object,
    jumpTypeCallback: Function,
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
