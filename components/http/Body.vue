<template>
  <div>
    <div class="flex flex-1 p-2 items-center justify-between">
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
              <ButtonSecondary class="pr-8" :label="contentType" outline />
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
