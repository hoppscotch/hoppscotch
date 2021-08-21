<template>
  <div class="flex flex-col flex-nowrap flex-1">
    <div class="rounded-t tabs hide-scrollbar relative" :class="styles">
      <div class="flex flex-1">
        <div class="flex flex-1 justify-between">
          <div class="flex">
            <button
              v-for="(tab, index) in tabs"
              :key="`tab-${index}`"
              class="tab"
              :class="{ active: tab.active }"
              tabindex="0"
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
          <div class="flex">
            <slot name="actions"></slot>
          </div>
        </div>
      </div>
    </div>
    <slot></slot>
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
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply bg-primary;

  // &::after {
  //   @apply absolute;
  //   @apply inset-x-0;
  //   @apply bottom-0;
  //   @apply bg-dividerLight;
  //   @apply z-1;
  //   @apply h-0.5;

  //   content: "";
  // }

  .tab {
    @apply relative;
    @apply flex;
    @apply items-center;
    @apply justify-center;
    @apply px-4 py-2;
    @apply text-secondary;
    @apply font-semibold;
    @apply cursor-pointer;
    @apply hover:text-secondaryDark;
    @apply focus:outline-none;
    @apply focus-visible:text-secondaryDark;

    .tab-info {
      @apply inline-flex;
      @apply items-center;
      @apply justify-center;
      @apply w-5;
      @apply h-4;
      @apply ml-2;
      @apply text-8px;
      @apply border border-divider;

      @apply rounded;
      @apply text-secondaryLight;
    }

    &::after {
      @apply absolute;
      @apply left-4;
      @apply right-4;
      @apply bottom-0;
      @apply bg-primary;
      @apply z-2;
      @apply h-0.5;

      content: "";
    }

    .material-icons {
      @apply mr-4;
    }

    &:focus::after {
      @apply bg-divider;
    }

    &.active {
      @apply text-secondaryDark;

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
