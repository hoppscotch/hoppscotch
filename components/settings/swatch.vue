<template>
  <div class="color" :data-color="color">
    <span :style="{backgroundColor: color}" class="preview">
      <svg v-if="active" class="activeTick" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
        <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
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
    padding: 0 8px;
    margin: 4px;
    background-color: var(--brd-color);
    color: var(--fg-color);
    border-radius: 8px;
    cursor: pointer;
    height: 41px;

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
      fill: #000;
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
