<template>
  <div class="color" :data-color="color" :class="{ active: active }" v-tooltip="{ content: name || color }">
    <span :style="{ backgroundColor: color }" class="preview">
      <i v-if="active" class="material-icons activeTick">done</i>
    </span>
  </div>
</template>

<style lang="scss">
.color {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 8px;
  border-radius: 100%;
  border: 3px solid var(--bg-dark-color);
  cursor: pointer;

  &.fg {
    color: var(--act-color);
  }

  &.active {
    border: 3px solid var(--ac-color);
  }

  &.fg.active {
    border: 3px solid var(--fg-color);
  }

  .preview {
    vertical-align: middle;
    display: inline-block;
    border-radius: 100%;
    padding: 16px;
    position: relative;

    .activeTick {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
}
</style>

<script>
export default {
  props: {
    color: {
      type: String,
      required: true
    },
    name: {
      type: String
    },
    active: {
      type: Boolean,
      default: false
    }
  }
};
</script>
