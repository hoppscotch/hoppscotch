<template>
  <div class="tabs-wrapper bg-blue-300">
    <div class="tabs" :class="styles">
      <div class="flex w-0">
        <div class="inline-flex">
          <button
            v-for="(tab, index) in tabs"
            :key="index"
            class="tab"
            :class="{ 'is-active': tab.isActive }"
            :tabindex="0"
            @keyup.enter="selectTab(tab)"
            @click="selectTab(tab)"
          >
            <i v-if="tab.icon" class="material-icons">
              {{ tab.icon }}
            </i>
            <span v-if="tab.label">{{ tab.label }}</span>
          </button>
        </div>
      </div>
    </div>
    <div class="tabs-details">
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
        tab.isActive = tab.id === id
      })
      this.$emit("tab-changed", id)
    },
  },
}
</script>

<style scoped lang="scss">
.tabs-wrapper {
  @apply flex;
  @apply flex-col;
  @apply flex-nowrap;
  @apply flex-1;

  .tabs {
    @apply flex;
    @apply flex-1;
    @apply whitespace-nowrap;
    @apply overflow-auto;

    .tab {
      @apply flex;
      @apply items-center;
      @apply justify-center;
      @apply px-4;
      @apply py-2;
      @apply text-secondaryLight;
      @apply font-semibold;
      @apply text-xs;
      @apply cursor-pointer;
      @apply transition;
      @apply border-b-2;
      @apply border-transparent;
      @apply rounded-t-lg;

      .material-icons {
        @apply mr-4;
      }

      &:hover {
        @apply text-secondaryDark;
      }
      &:focus {
        @apply text-secondaryDark;
        @apply outline-none;
      }
      &.is-active {
        @apply text-accent;
        @apply border-accent;
      }
    }
  }
}
</style>
