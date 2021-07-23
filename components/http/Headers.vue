<template>
  <AppSection label="headers">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-110px
        z-10
        sticky
        items-center
        justify-between
      "
    >
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
      :key="`header-${index}`"
      class="
        divide-x divide-dashed divide-divider
        border-b border-dashed border-divider
        flex
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
          updateHeader(index, {
            key: $event,
            value: header.value,
            active: header.active,
          })
        "
      />
      <input
        class="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          text-xs
          py-3
          px-4
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
