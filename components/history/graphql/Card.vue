<template>
  <div>
    <div class="show-on-large-screen">
      <li>
        <input
          data-testid="'url'"
          :aria-label="$t('url')"
          type="text"
          readonly
          :value="entry.url"
          :placeholder="$t('empty_req_name')"
          class="cursor-pointer text-sm input !bg-transparent"
          @click="$emit('use-entry')"
        />
      </li>
      <button
        v-tooltip="{
          content: !entry.star ? $t('add_star') : $t('remove_star'),
        }"
        data-testid="star_button"
        class="icon button"
        :class="{ stared: entry.star }"
        @click="$emit('toggle-star')"
      >
        <i class="material-icons">
          {{ entry.star ? "star" : "star_border" }}
        </i>
      </button>
      <button
        v-tooltip="{
          content: expand ? $t('hide_more') : $t('show_more'),
        }"
        data-testid="query_expand"
        class="icon button"
        @click="expand = !expand"
      >
        <i class="material-icons">
          {{ expand ? "unfold_less" : "unfold_more" }}
        </i>
      </button>
      <v-popover>
        <button
          v-tooltip="$t('options')"
          data-testid="options"
          class="tooltip-target icon button"
        >
          <i class="material-icons">more_vert</i>
        </button>
        <template #popover>
          <div>
            <button
              v-close-popover
              data-testid="restore_history_entry"
              class="icon button"
              :aria-label="$t('restore')"
              @click="$emit('use-entry')"
            >
              <i class="material-icons">restore</i>
              <span>{{ $t("restore") }}</span>
            </button>
          </div>
          <div>
            <button
              v-close-popover
              data-testid="delete_history_entry"
              class="icon button"
              :aria-label="$t('delete')"
              @click="$emit('delete-entry')"
            >
              <i class="material-icons">delete</i>
              <span>{{ $t("delete") }}</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>
    <div class="show-on-large-screen">
      <li data-testid="'query'">
        <input
          v-for="(line, index) in query"
          :key="`line-${index}`"
          :aria-label="$t('query')"
          type="text"
          readonly
          :value="`${line}`"
          class="text-sm input !bg-transparent !mt-0 !text-secondaryLight !pt-0"
        />
      </li>
    </div>
    <transition name="fade">
      <div v-if="showMore" class="show-on-large-screen">
        <li>
          <input
            v-tooltip="entry.date"
            :aria-label="$t('time')"
            type="text"
            readonly
            :value="entry.time"
            class="
              text-sm
              input
              !bg-transparent
              !mt-0
              !text-secondaryLight
              !pt-0
            "
          />
        </li>
        <li>
          <input
            :aria-label="$t('duration')"
            type="text"
            readonly
            :value="`Duration: ${entry.duration}ms`"
            :placeholder="$t('no_duration')"
            class="
              text-sm
              input
              !bg-transparent
              !mt-0
              !text-secondaryLight
              !pt-0
            "
          />
        </li>
        <!-- <li>
          <input class="input"
            :aria-label="$t('prerequest_script')"
            type="text"
            readonly
            :value="entry.preRequestScript"
            :placeholder="$t('no_prerequest_script')"
            class="bg-transparent mt-0 text-sm text-secondaryLight pt-0"
          />
        </li> -->
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  props: {
    entry: { type: Object, default: () => {} },
    showMore: Boolean,
  },
  data() {
    return {
      expand: false,
    }
  },
  computed: {
    query() {
      return this.expand
        ? this.entry.query.split("\n")
        : this.entry.query.split("\n").slice(0, 2).concat(["..."])
    },
  },
}
</script>

<style scoped lang="scss">
.stared {
  color: #f8e81c !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s;
}

.fade-enter,
.fade-leave-to {
  @apply opacity-0;
}
</style>
