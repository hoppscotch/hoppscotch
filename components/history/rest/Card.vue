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
      <span>
        <button
          v-tooltip="{
            content: !entry.star ? $t('add_star') : $t('remove_star'),
          }"
          data-testid="star_button"
          class="icon"
          :class="{ stared: entry.star }"
          @click="$emit('toggle-star')"
        >
          <i class="material-icons">
            {{ entry.star ? "star" : "star_border" }}
          </i>
        </button>
      </span>
      <!-- <li>
            <button
              class="icon"
              v-tooltip="{
                content: !entry.usesScripts
                  ? 'No pre-request script'
                  : 'Used pre-request script'
              }"
            >
              <i class="material-icons">
                {{ !entry.usesScripts ? "http" : "code" }}
              </i>
            </button>
          </li> -->
      <v-popover>
        <button v-tooltip="$t('options')" class="tooltip-target icon">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              v-close-popover
              data-testid="restore_history_entry"
              class="icon"
              :aria-label="$t('edit')"
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
              class="icon"
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
            v-tooltip="entry.date"
            :aria-label="$t('time')"
            type="text"
            readonly
            :value="entry.time"
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
        <!-- <li>
          <input
            :aria-label="$t('prerequest_script')"
            type="text"
            readonly
            :value="entry.preRequestScript"
            :placeholder="$t('no_prerequest_script')"
            class="pt-0 mt-0 text-sm bg-transparent text-fgLightColor"
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
  opacity: 0;
}
</style>
