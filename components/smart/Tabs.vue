<template>
  <div class="flex flex-col flex-nowrap flex-1">
    <div class="tabs hide-scrollbar relative" :class="styles">
      <div class="flex w-0">
        <div class="inline-flex">
          <button
            v-for="(tab, index) in tabs"
            :key="index"
            class="tab"
            :class="{ active: tab.active }"
            :tabindex="0"
            @keyup.enter="selectTab(tab)"
            @click="selectTab(tab)"
          >
            <i v-if="tab.icon" class="material-icons">
              {{ tab.icon }}
            </i>
            <span v-if="tab.label">{{ tab.label }}</span>
            <span v-if="tab.info" class="tab-info">
              {{ tab.info }}
            </span>
          </button>
        </div>
      </div>
    </div>
    <div>
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    styles: {
      type: String,
      default: "",
    },
  },

  data() {
    return {
      tabs: [],
    }
  },

  created() {
    this.tabs = this.$children
  },

  methods: {
    selectTab({ id }) {
      this.tabs.forEach((tab) => {
        tab.active = tab.id === id
      })
      this.$emit("tab-changed", id)
    },
  },
}
</script>

<style scoped lang="scss">
.tabs {
  @apply flex;
  @apply flex-1;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply bg-primary;

  &::after {
    @apply absolute;
    @apply inset-x-0;
    @apply bottom-0;
    @apply bg-dividerLight;
    @apply z-1;
    @apply h-0.5;

    content: "";
  }

  .tab {
    @apply flex;
    @apply items-center;
    @apply justify-center;
    @apply px-4;
    @apply py-3;
    @apply text-secondary;
    @apply font-semibold;
    @apply text-xs;
    @apply cursor-pointer;
    @apply transition;
    @apply hover:text-secondaryDark;
    @apply focus:text-secondaryDark;
    @apply focus:outline-none;
    @apply relative;

    .tab-info {
      @apply inline-flex;
      @apply items-center;
      @apply justify-center;
      @apply w-5;
      @apply h-4;
      @apply ml-2;
      @apply text-8px;
      @apply border border-divider;
      @apply font-mono;
      @apply rounded;
      @apply text-secondaryLight;
    }

    &::after {
      @apply absolute;
      @apply inset-x-0;
      @apply bottom-0;
      @apply bg-dividerLight;
      @apply z-2;
      @apply h-0.5;

      content: "";
    }

    .material-icons {
      @apply mr-4;
    }

    &.active {
      @apply text-accent;
      @apply border-accent;

      .tab-info {
        @apply text-secondary;
        @apply border-dividerDark;
      }

      &::after {
        @apply bg-accent;
      }
    }
  }
}
</style>
