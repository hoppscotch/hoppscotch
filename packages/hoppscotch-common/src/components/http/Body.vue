<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperMobileSecondaryStickyFold sm:top-upperSecondaryStickyFold"
    >
      <span class="flex items-center">
        <label class="font-semibold truncate text-secondaryLight">
          {{ t("request.content_type") }}
        </label>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions.focus()"
        >
          <span class="select-wrapper">
            <ButtonSecondary
              :label="contentType || t('state.none')"
              class="pr-8 ml-2 rounded-none"
            />
          </span>
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col space-y-2 divide-y focus:outline-none divide-dividerLight"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <SmartItem
                :label="t('state.none')"
                :info-icon="contentType === null ? IconDone : null"
                :active-info-icon="contentType === null"
                @click="
                  () => {
                    contentType = null
                    hide()
                  }
                "
              />
              <div
                v-for="(
                  contentTypeItems, contentTypeItemsIndex
                ) in segmentedContentTypes"
                :key="`contentTypeItems-${contentTypeItemsIndex}`"
                class="flex flex-col text-left"
              >
                <div class="flex px-4 py-2 rounded">
                  <span class="font-bold text-tiny text-secondaryLight">
                    {{ t(contentTypeItems.title) }}
                  </span>
                </div>
                <div class="flex flex-col">
                  <SmartItem
                    v-for="(
                      contentTypeItem, contentTypeIndex
                    ) in contentTypeItems.contentTypes"
                    :key="`contentTypeItem-${contentTypeIndex}`"
                    :label="contentTypeItem"
                    :info-icon="
                      contentTypeItem === contentType ? IconDone : null
                    "
                    :active-info-icon="contentTypeItem === contentType"
                    @click="
                      () => {
                        contentType = contentTypeItem
                        hide()
                      }
                    "
                  />
                </div>
              </div>
            </div>
          </template>
        </tippy>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="t('request.override_help')"
          :label="
            overridenContentType
              ? `${t('request.overriden')}: ${overridenContentType}`
              : t('request.override')
          "
          :icon="overridenContentType ? IconInfo : IconRefreshCW"
          :class="[
            '!px-1 !py-0.5',
            {
              'text-yellow-500 hover:text-yellow-500': overridenContentType,
            },
          ]"
          filled
          outline
          @click="contentTypeOverride('headers')"
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
        :src="`/images/states/${colorMode.value}/upload_single_file.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${t('empty.body')}`"
      />
      <span class="pb-4 text-center">{{ t("empty.body") }}</span>
      <ButtonSecondary
        outline
        :label="`${t('app.documentation')}`"
        to="https://docs.hoppscotch.io/features/body"
        blank
        :icon="IconExternalLink"
        reverse
        class="mb-4"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconDone from "~icons/lucide/check"
import IconInfo from "~icons/lucide/info"
import IconRefreshCW from "~icons/lucide/refresh-cw"
import IconExternalLink from "~icons/lucide/external-link"
import { computed, ref } from "vue"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { RequestOptionTabs } from "./RequestOptions.vue"
import { useStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { segmentedContentTypes } from "~/helpers/utils/contenttypes"
import {
  restContentType$,
  restHeaders$,
  setRESTContentType,
  setRESTHeaders,
  addRESTHeader,
} from "~/newstore/RESTSession"

const colorMode = useColorMode()
const t = useI18n()

const emit = defineEmits<{
  (e: "change-tab", value: string): void
}>()

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

// Template refs
const tippyActions = ref<any | null>(null)
</script>
