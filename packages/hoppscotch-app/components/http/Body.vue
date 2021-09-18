<template>
  <div>
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
                :label="contentType || $t('state.none').toLowerCase()"
                class="rounded-none ml-2 pr-8"
              />
            </span>
          </template>
          <SmartItem
            :label="$t('state.none').toLowerCase()"
            :info-icon="contentType === null ? 'done' : ''"
            :active-info-icon="contentType === null"
            @click.native="
              () => {
                contentType = null
                $refs.contentTypeOptions.tippy().hide()
              }
            "
          />
          <SmartItem
            v-for="(contentTypeItem, index) in validContentTypes"
            :key="`contentTypeItem-${index}`"
            :label="contentTypeItem"
            :info-icon="contentTypeItem === contentType ? 'done' : ''"
            :active-info-icon="contentTypeItem === contentType"
            @click.native="
              () => {
                contentType = contentTypeItem
                $refs.contentTypeOptions.tippy().hide()
              }
            "
          />
        </tippy>
      </span>
    </div>
    <HttpBodyParameters v-if="contentType === 'multipart/form-data'" />
    <HttpRawBody v-else-if="contentType !== null" :content-type="contentType" />
    <div
      v-if="contentType == null"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <span class="text-center pb-4">
        {{ $t("empty.body") }}
      </span>
      <ButtonSecondary
        outline
        :label="`${$t('app.documentation')}`"
        to="https://docs.hoppscotch.io"
        blank
        svg="external-link"
        reverse
      />
    </div>
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

      contentType: useStream(restContentType$, null, setRESTContentType),
    }
  },
})
</script>
