<template>
  <div
    class="color"
    :data-color="color"
    :class="{ active: active }"
    v-tooltip="{ content: name || color }"
    :style="{ backgroundColor: color }"
  >
    <i v-if="active" class="material-icons activeTick">done</i>
  </div>
</template>

<style scoped lang="scss">
.color {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 8px;
  padding: 16px;
  border-radius: 100%;
  border: 3px solid var(--bg-dark-color);
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &.fg {
    color: var(--act-color);
  }

  &.active {
    border: 3px solid var(--ac-color);
  }

  &.fg.active {
    border: 3px solid var(--fg-color);
  }

  .activeTick {
    position: absolute;
  }
}
</style>

<script>
export default {
  props: {
    color: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
