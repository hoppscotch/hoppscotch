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
          v-tippy="{ theme: 'tooltip' }"
          :title="
            overridenContentType
              ? 'The Content-Type is being overriden to ' + overridenContentType
              : $t('request.override_title')
          "
          :label="$t('request.override')"
          svg="refresh-cw"
          @click.native="changeTab('headers')"
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
import { Ref, watch, ref } from "@nuxtjs/composition-api"
import { HoppRESTHeader } from "@hoppscotch/data"
import { RequestOptionTabs } from "./RequestOptions.vue"
import { useStream } from "~/helpers/utils/composables"
import { knownContentTypes } from "~/helpers/utils/contenttypes"
import {
  restContentType$,
  restHeaders$,
  setRESTContentType,
  setRESTHeaders,
} from "~/newstore/RESTSession"

const emit = defineEmits(["changeTab"])

const validContentTypes = Object.keys(knownContentTypes)
const contentType = useStream(restContentType$, null, setRESTContentType)

// The functional headers list (the headers actually in the system)
const headers = useStream(restHeaders$, [], setRESTHeaders) as Ref<
  HoppRESTHeader[]
>

const overridenContentType = ref<string | null>(null)

watch(
  headers,
  (allHeaders: HoppRESTHeader[]) => {
    const headerContentType = allHeaders.find(
      (header) => header.key.toLowerCase() === "content-type"
    )
    overridenContentType.value = headerContentType
      ? headerContentType.value
      : null
  },
  { immediate: true }
)

const changeTab = (tab: RequestOptionTabs) => {
  emit("changeTab", tab)
}
</script>
