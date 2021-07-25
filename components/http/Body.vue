<template>
  <div>
    <div class="flex flex-1 py-2 items-center justify-between">
      <tippy
        ref="contentTypeOptions"
        interactive
        tabindex="-1"
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <div class="flex">
            <span class="select-wrapper">
              <input
                id="contentType"
                v-model="contentType"
                class="
                  bg-primary
                  rounded
                  flex
                  font-semibold font-mono
                  w-full
                  py-2
                  px-4
                  transition
                  truncate
                  focus:outline-none
                "
                readonly
              />
            </span>
          </div>
        </template>
        <SmartItem
          v-for="(contentTypeItem, index) in validContentTypes"
          :key="`contentTypeItem-${index}`"
          :label="contentTypeItem"
          @click.native="
            contentType = contentTypeItem
            $refs.contentTypeOptions.tippy().hide()
          "
        />
      </tippy>
      <SmartToggle :on="rawInput" class="px-4" @change="rawInput = !rawInput">
        {{ $t("raw_input") }}
      </SmartToggle>
    </div>
    <HttpBodyParameters v-if="!rawInput" :content-type="contentType" />
    <HttpRawBody v-else :content-type="contentType" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { pluckRef } from "~/helpers/utils/composables"
import { useRESTRequestBody } from "~/newstore/RESTSession"
import { knownContentTypes } from "~/helpers/utils/contenttypes"

export default defineComponent({
  setup() {
    return {
      contentType: pluckRef(useRESTRequestBody(), "contentType"),
      rawInput: pluckRef(useRESTRequestBody(), "isRaw"),
    }
  },
  data() {
    return {
      validContentTypes: Object.keys(knownContentTypes),
    }
  },
})
</script>
