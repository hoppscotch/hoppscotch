<template>
  <div>
    <div class="show-on-large-screen">
      <span
        class="p-2 m-2 truncate"
        :class="entryStatus.className"
        :style="{ '--status-code': entry.status }"
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
          class="bg-transparent"
        />
      </li>

      <v-popover>
        <button class="tooltip-target icon" v-tooltip="$t('options')">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              data-testid="restore_history_entry"
              class="icon"
              @click="$emit('use-entry')"
              :aria-label="$t('edit')"
              v-close-popover
            >
              <i class="material-icons">restore</i>
              <span>{{ $t("restore") }}</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>
    <div class="show-on-large-screen">
      <li>
        <input
          :aria-label="$t('url')"
          type="text"
          readonly
          :value="`${entry.url}${entry.path}`"
          :placeholder="$t('no_url')"
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
            :value="`Duration: ${entry.duration}ms`"
            :placeholder="$t('no_duration')"
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
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>

<script>
import findStatusGroup from "~/helpers/findStatusGroup"

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
