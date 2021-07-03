<template>
  <div>
    <div class="flex">
      <li>
        <input
          data-testid="'url'"
          :aria-label="$t('url')"
          type="text"
          readonly
          :value="entry.url"
          :placeholder="$t('empty_req_name')"
          class="input cursor-pointer text-sm bg-transparent"
          @click.native="$emit('use-entry')"
        />
      </li>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        title="{
          content: !entry.star ? $t('add_star') : $t('remove_star'),
        }"
        data-testid="star_button"
        :class="{ stared: entry.star }"
        @click.native="$emit('toggle-star')"
      />
      <i class="material-icons">
        {{ entry.star ? "star" : "star_border" }}
      </i>

      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        title="{
          content: expand ? $t('hide_more') : $t('show_more'),
        }"
        data-testid="query_expand"
        @click.native="expand = !expand"
      />
      <i class="material-icons">
        {{ expand ? "unfold_less" : "unfold_more" }}
      </i>

      <tippy tabindex="-1" trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('options')"
            data-testid="options"
          />
          <i class="material-icons">more_vert</i>
        </template>
        <div>
          <ButtonSecondary
            data-testid="restore_history_entry"
            :aria-label="$t('restore')"
            @click.native="$emit('use-entry')"
          />
          <i class="material-icons">restore</i>
          <span>{{ $t("restore") }}</span>
        </div>
        <div>
          <ButtonSecondary
            data-testid="delete_history_entry"
            :aria-label="$t('delete')"
            @click.native="$emit('delete-entry')"
          />
          <i class="material-icons">delete</i>
          <span>{{ $t("delete") }}</span>
        </div>
      </tippy>
    </div>
    <div class="flex">
      <li data-testid="'query'">
        <input
          v-for="(line, index) in query"
          :key="`line-${index}`"
          :aria-label="$t('query')"
          type="text"
          readonly
          :value="`${line}`"
          class="input pt-0 mt-0 text-sm bg-transparent text-secondaryLight"
        />
      </li>
    </div>
    <transition name="fade">
      <div v-if="showMore" class="flex">
        <li>
          <input
            v-tippy="{ theme: 'tooltip' }"
            title="entry.date"
            :aria-label="$t('time')"
            type="text"
            readonly
            :value="entry.time"
            class="input pt-0 mt-0 text-sm bg-transparent text-secondaryLight"
          />
        </li>
        <li>
          <input
            :aria-label="$t('duration')"
            type="text"
            readonly
            :value="`Duration: ${entry.duration}ms`"
            :placeholder="$t('no_duration')"
            class="input pt-0 mt-0 text-sm bg-transparent text-secondaryLight"
          />
        </li>
        <!-- <li>
          <input class="input"
            :aria-label="$t('prerequest_script')"
            type="text"
            readonly
            :value="entry.preRequestScript"
            :placeholder="$t('no_prerequest_script')"
            class="pt-0 mt-0 text-sm bg-transparent text-secondaryLight"
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
