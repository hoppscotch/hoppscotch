<template>
  <div class="type-box">
    <div class="type-title">{{ gqlType.name }}</div>
    <div class="type-desc" v-if="gqlType.description">
      {{ gqlType.description }}
    </div>

    <div v-if="gqlType.getFields">
      <h5>FIELDS</h5>
      <div v-for="field in gqlType.getFields()" :key="field.name">
        <gql-field :gqlField="field" />
      </div>
    </div>
  </div>
</template>

<style>
.type-box {
  padding: 1em;
  border-radius: 5px;
  border-style: solid;
  border-width: 0.01em;
  border-color: var(--fg-color);
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.type-desc {
  opacity: 0.7;
  margin-top: 0.5em;
}

.type-title {
  font-weight: bold;
}
</style>

<script>
export default {
  components: {
    "gql-field": () => import("./field")
  },
  props: {
    gqlType: {}
  }
};
</script>
