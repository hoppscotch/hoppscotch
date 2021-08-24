<template>
  <section class="tabs-wrapper">
    <div class="tabs" :class="styles">
      <ul>
        <li
          v-for="(tab, index) in tabs"
          :key="index"
          :class="{ 'is-active': tab.isActive }"
          :tabindex="0"
          @keyup.enter="selectTab(tab)"
        >
          <a :href="tab.href" @click="selectTab(tab)">
            <i v-if="tab.icon" class="material-icons">
              {{ tab.icon }}
            </i>
            <span v-if="tab.label">{{ tab.label }}</span>
          </a>
        </li>
      </ul>
    </div>
    <div class="tabs-details">
      <slot></slot>
    </div>
  </section>
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
  @apply flex flex-col flex-nowrap flex-1;

  .tabs {
    @apply flex;
    @apply whitespace-nowrap;
    @apply overflow-auto;
    @apply mt-4;

    ul {
      @apply flex;
      @apply w-0;
    }

    li {
      @apply inline-flex;
      @apply outline-none;
      @apply border-none;

      a {
        @apply flex;
        @apply items-center;
        @apply justify-center;
        @apply py-2 px-4;
        @apply text-secondaryLight text-sm;
        @apply rounded-lg;
        @apply cursor-pointer;
        @apply transition-colors;
        @apply ease-in-out;
        @apply duration-150;

        .material-icons {
          @apply m-4;
        }

        &:hover {
          @apply text-secondary;
        }
      }

      &:focus a {
        @apply text-secondary;
      }

      &.is-active a {
        @apply bg-divider;
        @apply text-secondary;
      }
    }
  }
}

@media (max-width: 768px) {
  ul,
  ol {
    @apply flex-row flex-nowrap;
  }
}
</style>
