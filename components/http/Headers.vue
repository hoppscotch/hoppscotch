<template>
  <AppSection label="headers">
    <div class="flex flex-1 items-center justify-between pl-4">
      <label for="headerList" class="font-semibold text-xs">
        {{ $t("header_list") }}
      </label>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
          icon="clear_all"
          @click.native="clearContent"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('add_new')"
          icon="add"
          @click.native="addHeader"
        />
      </div>
    </div>
    <div
      v-for="(header, index) in headers$"
      :key="index"
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
        @change="
          updateHeader(index, {
            key: $event.target.value,
            value: header.value,
            active: header.active,
          })
        "
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
          updateHeader(index, {
            key: header.key,
            value: $event.target.value,
            active: header.active,
          })
        "
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
            updateHeader(index, {
              key: header.key,
              value: header.value,
              active: header.hasOwnProperty('active') ? !header.active : false,
            })
          "
        />
      </div>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('delete')"
          icon="delete"
          @click.native="deleteHeader(index)"
        />
      </div>
    </div>
  </AppSection>
</template>

<script>
import {
  restHeaders$,
  addRESTHeader,
  updateRESTHeader,
  deleteRESTHeader,
  deleteAllRESTHeaders,
} from "~/newstore/RESTSession"

import { commonHeaders } from "~/helpers/headers"

export default {
  data() {
    return {
      commonHeaders,
    }
  },
  subscriptions() {
    return {
      headers$: restHeaders$,
    }
  },
  // watch: {
  //   headers: {
  //     handler(newValue) {
  //       if (
  //         newValue[newValue.length - 1]?.key !== "" ||
  //         newValue[newValue.length - 1]?.value !== ""
  //       )
  //         this.addRequestHeader()
  //     },
  //     deep: true,
  //   },
  // },
  mounted() {
    if (!this.headers$?.length) {
      this.addHeader()
    }
  },
  methods: {
    addHeader() {
      addRESTHeader({ key: "", value: "", active: true })
    },
    updateHeader(index, item) {
      console.log(index, item)
      updateRESTHeader(index, item)
    },
    deleteHeader(index) {
      deleteRESTHeader(index)
    },
    clearContent() {
      deleteAllRESTHeaders()
    },
  },
}
</script>
