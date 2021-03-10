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
          class="bg-transparent"
        />
      </li>
      <button
        data-testid="star_button"
        class="icon"
        :class="{ stared: entry.star }"
        @click="$emit('toggle-star')"
        v-tooltip="{
          content: !entry.star ? $t('add_star') : $t('remove_star'),
        }"
      >
        <i class="material-icons">
          {{ entry.star ? "star" : "star_border" }}
        </i>
      </button>
      <button
        data-testid="query_expand"
        class="icon"
        @click="expand = !expand"
        v-tooltip="{
          content: expand ? $t('hide_more') : $t('show_more'),
        }"
      >
        <i class="material-icons">
          {{ expand ? "unfold_less" : "unfold_more" }}
        </i>
      </button>
      <v-popover>
        <button data-testid="options" class="tooltip-target icon" v-tooltip="$t('options')">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              data-testid="restore_history_entry"
              class="icon"
              @click="$emit('use-entry')"
              :aria-label="$t('restore')"
              v-close-popover
            >
              <i class="material-icons">restore</i>
              <span>{{ $t("restore") }}</span>
            </button>
          </div>
          <div>
            <button
              data-testid="delete_history_entry"
              class="icon"
              @click="$emit('delete-entry')"
              :aria-label="$t('delete')"
              v-close-popover
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
          class="pt-0 mt-0 text-sm bg-transparent text-fgLightColor"
        />
      </li>
    </div>
    <transition name="fade">
      <div v-if="showMore" class="show-on-large-screen">
        <li>
          <input
            :aria-label="$t('time')"
            type="text"
            readonly
            :value="entry.time"
            v-tooltip="entry.date"
            class="pt-0 mt-0 text-sm bg-transparent text-fgLightColor"
          />
        </li>
        <li>
          <input
            :aria-label="$t('duration')"
            type="text"
            readonly
            :value="entry.duration"
            :placeholder="$t('no_duration')"
            class="pt-0 mt-0 text-sm bg-transparent text-fgLightColor"
          />
        </li>
        <li>
          <input
            :aria-label="$t('prerequest_script')"
            type="text"
            readonly
            :value="entry.preRequestScript"
            :placeholder="$t('no_prerequest_script')"
            class="pt-0 mt-0 text-sm bg-transparent text-fgLightColor"
          />
        </li>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.stared {
  color: #f8e81c !important;
}
</style>

<script>
export default {
  props: {
    entry: Object,
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
