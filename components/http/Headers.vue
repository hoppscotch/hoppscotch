<template>
  <AppSection label="headers">
    <ul v-if="headers.length !== 0">
      <li>
        <div class="row-wrapper">
          <label for="headerList">{{ $t("header_list") }}</label>
          <div>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('clear')"
              icon="clear_all"
              @click.native="clearContent('headers', $event)"
            />
          </div>
        </div>
      </li>
    </ul>
    <ul
      v-for="(header, index) in headers"
      :key="`${header.value}_${index}`"
      class="
        border-b border-dashed
        divide-y
        md:divide-x
        border-divider
        divide-dashed divide-divider
        md:divide-y-0
      "
      :class="{ 'border-t': index == 0 }"
    >
      <li>
        <SmartAutoComplete
          :placeholder="$t('header_count', { count: index + 1 })"
          :source="commonHeaders"
          :spellcheck="false"
          :value="header.key"
          autofocus
          @input="
            $store.commit('setKeyHeader', {
              index,
              value: $event,
            })
          "
          @keyup.prevent="setRouteQueryState"
        />
      </li>
      <li>
        <input
          class="input"
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
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            title="{
              content: header.hasOwnProperty('active')
                ? header.active
                  ? $t('turn_off')
                  : $t('turn_on')
                : $t('turn_off'),
            }"
            :icon="
              param.hasOwnProperty('active')
                ? param.active
                  ? 'check_box'
                  : 'check_box_outline_blank'
                : 'check_box'
            "
            @click.native="
              $store.commit('setActiveHeader', {
                index,
                value: header.hasOwnProperty('active') ? !header.active : false,
              })
            "
          />
        </li>
      </div>
      <div>
        <li>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('delete')"
            icon="delete"
            @click.native="removeRequestHeader(index)"
          />
        </li>
      </div>
    </ul>
    <ul>
      <li>
        <ButtonSecondary
          icon="add"
          :label="$t('add_new')"
          @click.native="addRequestHeader"
        />
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
