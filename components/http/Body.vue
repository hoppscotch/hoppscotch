<template>
  <div>
    <div class="flex flex-1 p-2 items-center justify-between">
      <span class="flex">
        <span
          class="
            border
            rounded-r-none rounded
            border-divider border-r-0
            font-semibold
            text-secondaryLight
            py-2
            px-4
            py-2
          "
        >
          {{ $t("content_type") }}
        </span>
        <tippy
          ref="contentTypeOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <div class="flex">
              <span class="select-wrapper">
                <ButtonSecondary
                  :label="contentType"
                  outline
                  class="rounded-l-none pr-8"
                />
              </span>
            </div>
          </template>
          <SmartItem
            v-for="(contentTypeItem, index) in validContentTypes"
            :key="`contentTypeItem-${index}`"
            :label="contentTypeItem"
            :info-icon="contentTypeItem === contentType ? 'done' : ''"
            :active-info-icon="contentTypeItem === contentType"
            @click.native="
              contentType = contentTypeItem
              $refs.contentTypeOptions.tippy().hide()
            "
          />
        </tippy>
      </span>
      <SmartToggle :on="rawInput" class="px-2" @change="rawInput = !rawInput">
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
