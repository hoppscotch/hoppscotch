<template>
  <div class="tabs-wrapper">
    <div class="tabs">
      <ul>
        <li v-for="tab in tabs" :class="{ 'is-active': tab.isActive }">
          <a :href="tab.href" @click="selectTab(tab)">{{ tab.name }}</a>
        </li>
      </ul>
    </div>
    <div class="tabs-details">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tabs-wrapper {
  display: flex;
  flex-flow: column nowrap;
  flex-grow: 1;

  .tabs {
    -webkit-overflow-scrolling: touch;
    display: flex;
    white-space: nowrap;
    overflow: auto;

    ul {
      display: flex;
      width: 0px;
    }

    li {
      display: inline-flex;

      a {
        display: flex;
        padding: 8px 16px;
        color: var(--fg-light-color);
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          color: var(--fg-color);
        }
      }

      &.is-active a {
        background-color: var(--brd-color);
        color: var(--fg-color);
      }
    }
  }
}

@media (max-width: 768px) {
  ul,
  ol {
    flex-flow: row nowrap;
  }
}
</style>

<script>
export default {
  data() {
    return {
      tabs: [],
    }
  },

  created() {
    this.tabs = this.$children
  },

  methods: {
    selectTab({ name }) {
      this.tabs.forEach(tab => {
        tab.isActive = tab.name == name
      })
    },
  },
}
</script>
