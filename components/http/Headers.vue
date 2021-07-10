<template>
  <AppSection label="headers">
    <div
      v-if="headers.length !== 0"
      class="flex flex-1 items-center justify-between pl-4"
    >
      <label for="headerList" class="font-semibold text-xs">
        {{ $t("header_list") }}
      </label>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="$t('clear')"
        icon="clear_all"
        @click.native="clearContent('headers', $event)"
      />
    </div>
    <div
      v-for="(header, index) in headers"
      :key="`${header.value}_${index}`"
      class="
        flex
        border-b border-dashed
        divide-x
        border-divider
        divide-dashed divide-divider
      "
      :class="{ 'border-t': index == 0 }"
    >
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
      <input
        class="
          px-4
          py-3
          text-xs
          flex flex-1
          font-semibold
          bg-primaryLight
          focus:outline-none
        "
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
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="
            header.hasOwnProperty('active')
              ? header.active
                ? $t('turn_off')
                : $t('turn_on')
              : $t('turn_off')
          "
          :icon="
            header.hasOwnProperty('active')
              ? header.active
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
      </div>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('delete')"
          icon="delete"
          @click.native="removeRequestHeader(index)"
        />
      </div>
    </div>
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
  watch: {
    headers: {
      handler(newValue) {
        if (
          newValue[newValue.length - 1]?.key !== "" ||
          newValue[newValue.length - 1]?.value !== ""
        )
          this.addRequestHeader()
      },
      deep: true,
    },
  },
  mounted() {
    if (!this.params?.length) {
      this.addRequestHeader()
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
