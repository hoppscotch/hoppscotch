<template>
  <div>
    <div class="show-on-large-screen">
      <span class="p-2 m-2">
        {{ `${entry.method}` }}
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
      <button
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
        class="icon"
        @click="expand = !expand"
        v-tooltip="{
          content: !entry.expand ? 'show less' : 'show more',
        }"
      >
        <i class="material-icons">
          {{ expand ? "compress" : "expand" }}
        </i>
      </button>
      <v-popover>
        <button class="tooltip-target icon" v-tooltip="$t('options')">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              class="icon"
              @click="$emit('use-entry')"
              :aria-label="$t('edit')"
              v-close-popover
            >
              <i class="material-icons">restore</i>
              <span>{{ $t("restore") }}</span>
            </button>
          </div>
          <div>
            <button
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
      <li>
        <input
          v-for="(line, index) in expand
            ? entry.query.split('\n')
            : entry.query.split('\n').slice(0, 2).concat(['...'])"
          v-bind:key="index"
          :aria-label="$t('url')"
          type="text"
          readonly
          :value="`${entry.type == 'graphql' ? line : entry.url + entry.path}`"
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

<script>
import findStatusGroup from "~/helpers/findStatusGroup"

export default {
  name: "historyGraphqlCard",
  props: {
    entry: Object,
    showMore: Boolean,
  },
  data() {
    return {
      expand: false,
    }
  },
}
</script>
