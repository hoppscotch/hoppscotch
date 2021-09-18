<template>
  <div
    class="flex flex-nowrap flex-1 h-full"
    :class="{ 'flex-col': !vertical }"
  >
    <div
      class="tabs hide-scrollbar relative"
      :class="[{ 'border-r border-dividerLight': vertical }, styles]"
    >
      <div class="flex flex-1">
        <div
          class="flex flex-1 justify-between"
          :class="{ 'flex-col': vertical }"
        >
          <div class="flex" :class="{ 'flex-col space-y-2 p-2': vertical }">
            <button
              v-for="(tab, index) in tabs"
              :key="`tab-${index}`"
              class="tab"
              :class="[{ active: tab.active }, { vertical: vertical }]"
              tabindex="0"
              @keyup.enter="selectTab(tab)"
              @click="selectTab(tab)"
            >
              <SmartIcon v-if="tab.icon" class="svg-icons" :name="tab.icon" />
              <tippy
                v-if="vertical && tab.label"
                placement="left"
                theme="tooltip"
                :content="tab.label"
              />
              <span v-else-if="tab.label">{{ tab.label }}</span>
              <span v-if="tab.info && tab.info !== 'null'" class="tab-info">
                {{ tab.info }}
              </span>
            </button>
          </div>
          <div class="flex justify-center items-center">
            <slot name="actions"></slot>
          </div>
        </div>
      </div>
    </div>
    <div
      :class="{
        'flex flex-col flex-1 overflow-y-auto hide-scrollbar': vertical,
      }"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    styles: {
      type: String,
      default: "",
    },
    vertical: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      tabs: [],
    }
  },

  mounted() {
    this.tabs = this.$children.filter(
      (child) => child.$options.name === "SmartTab"
    )
  },

  methods: {
    selectTab({ id }) {
      this.tabs.forEach((tab) => {
        tab.active = tab.id === id
      })
      this.$emit("tab-changed", id)
    },
  },
})
</script>

<style scoped lang="scss">
.tabs {
  @apply flex;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply flex-shrink-0;

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
    @apply flex-shrink-0;
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
      @apply bg-transparent;
      @apply z-2;
      @apply h-0.5;

      content: "";
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

    &.vertical {
      @apply p-2;
      @apply rounded;

      &:focus::after {
        @apply hidden;
      }

      &.active {
        @apply text-accent;

        .tab-info {
          @apply text-secondary;
          @apply border-dividerDark;
        }

        &::after {
          @apply hidden;
        }
      }
    }
  }
}
</style>
