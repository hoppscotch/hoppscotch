<template>
  <AppSection label="headers">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-upperSecondaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-secondaryLight">
        {{ $t("request.header_list") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/headers"
          blank
          :title="$t('app.wiki')"
          icon="help_outline"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.clear_all')"
          icon="clear_all"
          @click.native="clearContent"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('add.new')"
          icon="add"
          @click.native="addHeader"
        />
      </div>
    </div>
    <div
      v-for="(header, index) in headers$"
      :key="`header-${index}`"
      class="divide-x divide-dividerLight border-b border-dividerLight flex"
    >
      <SmartAutoComplete
        :placeholder="$t('count.header', { count: index + 1 })"
        :source="commonHeaders"
        :spellcheck="false"
        :value="header.key"
        autofocus
        styles="
          bg-primary
          flex
          flex-1
          py-1
          px-4
          truncate
        "
        :class="{ '!flex flex-1': EXPERIMENTAL_URL_BAR_ENABLED }"
        @input="
          updateHeader(index, {
            key: $event,
            value: header.value,
            active: header.active,
          })
        "
      />
      <SmartEnvInput
        v-if="EXPERIMENTAL_URL_BAR_ENABLED"
        v-model="header.value"
        :placeholder="$t('count.value', { count: index + 1 })"
        styles="
          bg-primary
          flex
          flex-1
          py-1
          px-4
        "
        @change="
          updateHeader(index, {
            key: header.key,
            value: $event,
            active: header.active,
          })
        "
      />
      <input
        v-else
        class="bg-primary flex flex-1 py-2 px-4"
        :placeholder="$t('count.value', { count: index + 1 })"
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
      <span>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="
            header.hasOwnProperty('active')
              ? header.active
                ? $t('action.turn_off')
                : $t('action.turn_on')
              : $t('action.turn_off')
          "
          :icon="
            header.hasOwnProperty('active')
              ? header.active
                ? 'check_circle_outline'
                : 'radio_button_unchecked'
              : 'check_circle_outline'
          "
          color="green"
          @click.native="
            updateHeader(index, {
              key: header.key,
              value: header.value,
              active: header.hasOwnProperty('active') ? !header.active : false,
            })
          "
        />
      </span>
      <span>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.remove')"
          icon="remove_circle_outline"
          color="red"
          @click.native="deleteHeader(index)"
        />
      </span>
    </div>
    <div
      v-if="headers$.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <span class="text-center pb-4">
        {{ $t("empty.headers") }}
      </span>
      <ButtonSecondary
        filled
        :label="$t('add.new')"
        icon="add"
        @click.native="addHeader"
      />
    </div>
  </AppSection>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import {
  restHeaders$,
  addRESTHeader,
  updateRESTHeader,
  deleteRESTHeader,
  deleteAllRESTHeaders,
} from "~/newstore/RESTSession"
import { commonHeaders } from "~/helpers/headers"
import { useSetting } from "~/newstore/settings"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { HoppRESTHeader } from "~/helpers/types/HoppRESTRequest"

export default defineComponent({
  setup() {
    return {
      headers$: useReadonlyStream(restHeaders$, []),
      EXPERIMENTAL_URL_BAR_ENABLED: useSetting("EXPERIMENTAL_URL_BAR_ENABLED"),
    }
  },
  data() {
    return {
      commonHeaders,
    }
  },
  watch: {
    headers$: {
      handler(newValue) {
        console.log("changed")
        if (
          (newValue[newValue.length - 1]?.key !== "" ||
            newValue[newValue.length - 1]?.value !== "") &&
          newValue.length
        )
          this.addHeader()
      },
      deep: true,
    },
  },
  // mounted() {
  //   if (!this.headers$?.length) {
  //     this.addHeader()
  //   }
  // },
  methods: {
    addHeader() {
      addRESTHeader({ key: "", value: "", active: true })
    },
    updateHeader(index: number, item: HoppRESTHeader) {
      console.log(index, item)
      updateRESTHeader(index, item)
    },
    deleteHeader(index: number) {
      deleteRESTHeader(index)
    },
    clearContent() {
      deleteAllRESTHeaders()
    },
  },
})
</script>
