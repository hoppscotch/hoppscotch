<template>
  <AppSection label="Headers" ref="headers" no-legend>
    <ul v-if="headers.length !== 0">
      <li>
        <div class="row-wrapper">
          <label for="headerList">{{ $t("header_list") }}</label>
          <div>
            <button
              class="icon"
              @click="clearContent('headers', $event)"
              v-tooltip.bottom="$t('clear')"
            >
              <i class="material-icons">clear_all</i>
            </button>
          </div>
        </div>
      </li>
    </ul>
    <ul
      v-for="(header, index) in headers"
      :key="`${header.value}_${index}`"
      class="border-b border-dashed divide-y md:divide-x border-brdColor divide-dashed divide-brdColor md:divide-y-0"
      :class="{ 'border-t': index == 0 }"
    >
      <li>
        <SmartAutoComplete
          :placeholder="$t('header_count', { count: index + 1 })"
          :source="commonHeaders"
          :spellcheck="false"
          :value="header.key"
          @input="
            $store.commit('setKeyHeader', {
              index,
              value: $event,
            })
          "
          @keyup.prevent="setRouteQueryState"
          autofocus
        />
      </li>
      <li>
        <input
          :placeholder="$t('value_count', { count: index + 1 })"
          :name="'value' + index"
          :value="header.value"
          @change="
            $store.commit('setValueHeader', {
              index,
              value: $event.target.value,
            })
          "
          @keyup.prevent="setRouteQueryState"
        />
      </li>
      <div>
        <li>
          <button
            class="icon"
            @click="
              $store.commit('setActiveHeader', {
                index,
                value: header.hasOwnProperty('active') ? !header.active : false,
              })
            "
            v-tooltip.bottom="{
              content: header.hasOwnProperty('active')
                ? header.active
                  ? $t('turn_off')
                  : $t('turn_on')
                : $t('turn_off'),
            }"
          >
            <i class="material-icons">
              {{
                header.hasOwnProperty("active")
                  ? header.active
                    ? "check_box"
                    : "check_box_outline_blank"
                  : "check_box"
              }}
            </i>
          </button>
        </li>
      </div>
      <div>
        <li>
          <button class="icon" @click="removeRequestHeader(index)" v-tooltip.bottom="$t('delete')">
            <i class="material-icons">delete</i>
          </button>
        </li>
      </div>
    </ul>
    <ul>
      <li>
        <button class="icon" @click="addRequestHeader">
          <i class="material-icons">add</i>
          <span>{{ $t("add_new") }}</span>
        </button>
      </li>
    </ul>
  </AppSection>
</template>

<script>
import { commonHeaders } from "~/helpers/headers"

export default {
  props: {
    headers: { type: Array, default: () => [] },
  },
  data() {
    return {
      commonHeaders,
    }
  },
  methods: {
    clearContent(headers, $event) {
      this.$emit("clear-content", headers, $event)
    },
    setRouteQueryState() {
      this.$emit("set-route-query-state")
    },
    removeRequestHeader(index) {
      this.$emit("remove-request-header", index)
    },
    addRequestHeader() {
      this.$emit("add-request-header")
    },
  },
}
</script>
