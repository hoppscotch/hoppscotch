<template>
  <div>
    <div class="flex">
      <span
        class="p-2 m-2 truncate inline-flex cursor-pointer items-center text-sm"
        :class="entryStatus.className"
        :style="{ '--status-code': entry.status }"
        @click="$emit('use-entry')"
      >
        {{ `${entry.method} \xA0 • \xA0 ${entry.status}` }}
      </span>
      <li>
        <input
          :aria-label="$t('token_req_name')"
          type="text"
          readonly
          :value="entry.name"
          :placeholder="$t('empty_req_name')"
          class="input cursor-pointer text-sm bg-transparent"
          @click="$emit('use-entry')"
        />
      </li>
      <span>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          title="{
            content: !entry.star ? $t('add_star') : $t('remove_star'),
          }"
          data-testid="star_button"
          :class="{ stared: entry.star }"
          :icon="entry.star ? 'star' : 'star_border'"
          @click.native="$emit('toggle-star')"
        />
      </span>
      <!-- <li>
            <ButtonSecondary

              v-tippy="{ theme: 'tooltip' }" title="{
                content: !entry.usesScripts
                  ? 'No pre-request script'
                  : 'Used pre-request script'
              }"
            >
              <i class="material-icons">
                {{ !entry.usesScripts ? "http" : "code" }}
              </i>

          </li> -->
      <tippy tabindex="-1" trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('options')"
            icon="more_vert"
          />
        </template>
        <div>
          <ButtonSecondary
            data-testid="restore_history_entry"
            :aria-label="$t('edit')"
            icon="restore"
            :label="$t('restore')"
            @click.native="$emit('use-entry')"
          />
        </div>
        <div>
          <ButtonSecondary
            data-testid="delete_history_entry"
            :aria-label="$t('delete')"
            icon="delete"
            :label="$t('delete')"
            @click.native="$emit('delete-entry')"
          />
        </div>
      </tippy>
    </div>
    <div class="flex">
      <li>
        <input
          :aria-label="$t('url')"
          type="text"
          readonly
          :value="`${entry.url}${entry.path}`"
          :placeholder="$t('no_url')"
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
import findStatusGroup from "~/helpers/findStatusGroup"

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
    entryStatus() {
      const foundStatusGroup = findStatusGroup(this.entry.status)
      return (
        foundStatusGroup || {
          className: "",
        }
      )
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
