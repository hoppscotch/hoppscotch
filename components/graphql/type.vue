<template>
  <div class="p-2 m-2">
    <div class="font-bold type-title">{{ gqlType.name }}</div>
    <div class="mt-2 text-fgLightColor type-desc" v-if="gqlType.description">
      {{ gqlType.description }}
    </div>
    <div v-if="gqlType.getFields">
      <h5>{{ $t("fields") }}</h5>
      <div v-for="field in gqlType.getFields()" :key="field.name">
        <field :gqlField="field" :jumpTypeCallback="jumpTypeCallback" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    gqlType: {},
    jumpTypeCallback: Function,
  },
}
</script>
