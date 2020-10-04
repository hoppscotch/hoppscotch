<template>
  <div>
    <ul v-if="headers.length !== 0">
      <li>
        <div class="row-wrapper">
          <label for="headerList">{{ $t("header_list") }}</label>
          <div>
            <button class="icon" @click="clearRequestHeaderContent" v-tooltip.bottom="$t('clear')">
              <i class="material-icons">clear_all</i>
            </button>
          </div>
        </div>
      </li>
    </ul>
    <ul v-for="(header, index) in headers" :key="`header_${index}`">
      <li>
        <autocomplete
          :placeholder="$t('header_count', { count: index + 1 })"
          :source="commonHeaders"
          :spellcheck="false"
          :value="header.key"
          autofocus
          @input="debouncedUpdateHeaderKey({ headerIndex: index, headerKey: $event })"
          @change="updateHeaderKey({ headerIndex: index, headerKey: $event })"
        />
      </li>
      <li>
        <input
          :placeholder="$t('value_count', { count: index + 1 })"
          :name="'value' + index"
          :value="header.value"
          @input="
            debouncedUpdateHeaderValue({ headerIndex: index, headerValue: $event.target.value })
          "
        />
      </li>
      <div>
        <li>
          <button
            class="icon"
            @click="removeRequestHeader(index)"
            v-tooltip.bottom="$t('delete')"
            id="header"
          >
            <deleteIcon class="material-icons" />
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
  </div>
</template>

<style></style>

<script>
import { debounce } from "lodash-es"
import { commonHeaders } from "~/helpers/headers"
import deleteIcon from "~/static/icons/delete-24px.svg?inline"

export default {
  props: {
    value: { type: Array, default: [] },
  },
  components: {
    deleteIcon,
  },
  data: () => ({
    headers: [],
    commonHeaders,
  }),
  watch: {
    value: {
      handler(headers) {
        this.headers = JSON.parse(JSON.stringify(headers))
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    addRequestHeader() {
      this.$emit("add-request-header")
    },
    removeRequestHeader(index) {
      this.$emit("remove-request-header", { index })
    },
    clearRequestHeaderContent() {
      this.$emit("clear-content", { key: "headers", event: $event })
    },
    debouncedUpdateHeaderKey: debounce(function (payload) {
      this.updateHeaderKey(payload)
    }, 200),
    updateHeaderKey({ headerIndex, headerKey }) {
      const updatedHeaders = this.headers.map((header, index) => {
        if (headerIndex === index) {
          return {
            ...header,
            key: headerKey,
          }
        }
        return header
      })

      this.$emit("input", updatedHeaders)
    },
    debouncedUpdateHeaderValue: debounce(function (payload) {
      this.updateHeaderValue(payload)
    }, 200),
    updateHeaderValue({ headerIndex, headerValue }) {
      const updatedHeaders = this.headers.map((header, index) => {
        if (headerIndex === index) {
          return {
            ...header,
            value: headerValue,
          }
        }
        return header
      })

      this.$emit("input", updatedHeaders)
    },
  },
}
</script>
