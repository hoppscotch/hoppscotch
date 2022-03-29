<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperMobileSecondaryStickyFold sm:top-upperSecondaryStickyFold"
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
                class="pr-8 ml-2 rounded-none"
              />
            </span>
          </template>
          <div class="flex flex-col" role="menu">
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
          </div>
        </tippy>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="$t('request.override_help')"
          :label="
            overridenContentType
              ? `${$t('request.overriden')}: ${overridenContentType}`
              : $t('request.override')
          "
          :svg="overridenContentType ? 'info' : 'refresh-cw'"
          :class="[
            '!px-1 !py-0.5',
            {
              'text-yellow-500 hover:text-yellow-500': overridenContentType,
            },
          ]"
          filled
          outline
          @click.native="contentTypeOverride('headers')"
        />
      </span>
    </div>
    <HttpBodyParameters v-if="contentType === 'multipart/form-data'" />
    <HttpURLEncodedParams
      v-else-if="contentType === 'application/x-www-form-urlencoded'"
    />
    <HttpRawBody v-else-if="contentType !== null" :content-type="contentType" />
    <div
      v-if="contentType == null"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${$colorMode.value}/upload_single_file.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${$t('empty.body')}`"
      />
      <span class="pb-4 text-center">{{ $t("empty.body") }}</span>
      <ButtonSecondary
        outline
        :label="`${$t('app.documentation')}`"
        to="https://docs.hoppscotch.io/features/body"
        blank
        svg="external-link"
        reverse
        class="mb-4"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "@nuxtjs/composition-api"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { RequestOptionTabs } from "./RequestOptions.vue"
import { useStream } from "~/helpers/utils/composables"
import { knownContentTypes } from "~/helpers/utils/contenttypes"
import {
  restContentType$,
  restHeaders$,
  setRESTContentType,
  setRESTHeaders,
  addRESTHeader,
} from "~/newstore/RESTSession"

const emit = defineEmits<{
  (e: "change-tab", value: string): void
}>()

const validContentTypes = Object.keys(knownContentTypes)
const contentType = useStream(restContentType$, null, setRESTContentType)

// The functional headers list (the headers actually in the system)
const headers = useStream(restHeaders$, [], setRESTHeaders)

const overridenContentType = computed(() =>
  pipe(
    headers.value,
    A.findLast((h) => h.key.toLowerCase() === "content-type" && h.active),
    O.map((h) => h.value),
    O.getOrElse(() => "")
  )
)

const contentTypeOverride = (tab: RequestOptionTabs) => {
  emit("change-tab", tab)
  if (!isContentTypeAlreadyExist()) {
    addRESTHeader({
      key: "Content-Type",
      value: "",
      active: true,
    })
  }
}

const isContentTypeAlreadyExist = () => {
  return pipe(
    headers.value,
    A.some((e) => e.key.toLowerCase() === "content-type")
  )
}
</script>
