<template>
  <div class="color" :data-color="color">
    <span :style="{backgroundColor: color}" class="preview">
      <svg v-if="active" class="activeTick" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12"/>
      </svg>
    </span>
    {{ name || color }}
  </div>
</template>

<style lang="scss">
  .color {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px 0 4px;
    margin: 4px;
    background-color: var(--bg-dark-color);
    color: var(--fg-color);
    border-radius: 20px;
    cursor: pointer;
    height: 40px;

    &.active {
      background-color: var(--bg-dark-color);
    }

    .preview {
      vertical-align: middle;
      display: inline-block;
      border-radius: 100%;
      margin-right: 8px;
      padding: 16px;
      position: relative;

      .activeTick {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          fill: #fff;
      }
    }
  }

  .color.vibrant {
    .preview .activeTick {
      fill: var(--act-color);
    }
  }
</style>

<script>
  export default {
    props: {
      'color': {
        type: String,
        required: true
      },
      'name': {
        type: String
      },
      'active': {
        type: Boolean,
        default: false
      }
    }
  }
</script>
