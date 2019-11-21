<template>
  <div class="field-box">
    <div class="field-title">{{ fieldString }}</div>
    <div class="field-desc" v-if="gqlField.description">
      {{ gqlField.description }}
    </div>

    <div class="field-deprecated" v-if="gqlField.isDeprecated">
      DEPRECATED
    </div>
  </div>
</template>

<style>
.field-box {
  padding: 16px;
  margin: 4px;
  border-bottom: 1px solid var(--brd-color);
}

.field-deprecated {
  background-color: yellow;
  color: black;
  display: inline-block;
  padding: 4px 8px;
  margin: 4px 0;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 700;
}

.field-desc {
  color: var(--fg-light-color);
  margin-top: 4px;
}
</style>

<script>
export default {
  props: {
    gqlField: Object
  },

  computed: {
    fieldString() {
      const args = (this.gqlField.args || []).reduce((acc, arg, index) => {
        return (
          acc +
          `${arg.name}: ${arg.type.toString()}${
            index !== this.gqlField.args.length - 1 ? ", " : ""
          }`
        );
      }, "");
      const argsString = args.length > 0 ? `(${args})` : "";

      return `${
        this.gqlField.name
      }${argsString}: ${this.gqlField.type.toString()}`;
    }
  }
};
</script>
