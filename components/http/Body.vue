<template>
  <div>
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        items-center
        justify-between
      "
    >
      <span class="flex items-center">
        <label class="font-semibold text-secondaryLight">
          {{ $t("request.content_type") }}
        </label>
        <tippy
          ref="contentTypeOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <span class="select-wrapper">
              <ButtonSecondary
                :label="contentType"
                class="rounded-none ml-2 pr-8"
              />
            </span>
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
    </div>
    <HttpBodyParameters v-if="contentType === 'multipart/form-data'" />
    <HttpRawBody v-else :content-type="contentType" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { useStream } from "~/helpers/utils/composables"
import { restContentType$, setRESTContentType } from "~/newstore/RESTSession"
import { knownContentTypes } from "~/helpers/utils/contenttypes"

export default defineComponent({
  setup() {
    return {
      validContentTypes: Object.keys(knownContentTypes),

      contentType: useStream(
        restContentType$,
        "application/json",
        setRESTContentType
      ),
    }
  },
})
</script>
