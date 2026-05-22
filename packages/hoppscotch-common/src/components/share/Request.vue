<template>
  <div
    class="flex items-stretch group"
    @contextmenu.prevent="options!.tippy.show()"
  >
    <div
      v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
      class="flex items-center justify-center flex-1 min-w-0 py-2 cursor-pointer pointer-events-auto"
      :title="`${timeStamp}`"
      @click="customizeSharedRequest()"
    >
      <span
        v-if="parsed.protocol === 'rest'"
        class="flex items-center justify-center w-16 px-2 truncate pointer-events-none"
        :style="{ color: requestLabelColor }"
      >
        <span class="font-semibold truncate text-tiny">
          {{ parsed.request.method }}
        </span>
      </span>
      <span
        v-else
        class="flex items-center justify-center w-16 px-2 pointer-events-none text-accent"
      >
        <component :is="IconGraphql" class="h-4 w-4" />
      </span>
      <span
        class="flex items-center flex-1 min-w-0 pr-2 transition pointer-events-none group-hover:text-secondaryDark"
      >
        <span class="flex-1 truncate">
          {{
            parsed.protocol === "rest"
              ? parsed.request.endpoint
              : parsed.request.url
          }}
        </span>
      </span>
      <span
        class="flex px-2 truncate text-secondaryLight group-hover:text-secondaryDark"
      >
        {{ parsed.request.name }}
      </span>
    </div>
    <div>
      <span>
        <tippy
          ref="options"
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions!.focus()"
        >
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.more')"
            :icon="IconMoreVertical"
          />
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              role="menu"
              @keyup.t="openInNewTabAction?.$el.click()"
              @keyup.e="customizeAction?.$el.click()"
              @keyup.delete="deleteAction?.$el.click()"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                ref="openInNewTabAction"
                :icon="IconArrowUpRight"
                :label="`${t('shared_requests.open_new_tab')}`"
                :shortcut="['T']"
                @click="
                  () => {
                    emit('open-shared-request', parsed.request)
                    hide()
                  }
                "
              />
              <HoppSmartItem
                ref="customizeAction"
                :icon="IconCustomize"
                :label="`${t('shared_requests.customize')}`"
                :shortcut="['E']"
                @click="
                  () => {
                    customizeSharedRequest()
                    hide()
                  }
                "
              />
              <HoppSmartItem
                ref="deleteAction"
                :icon="IconTrash2"
                :label="`${t('action.delete')}`"
                :shortcut="['⌫']"
                @click="
                  () => {
                    deleteSharedRequest()
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  HoppGQLRequest,
  HoppRESTRequest,
  translateToGQLRequest,
  translateToNewRequest,
} from "@hoppscotch/data"
import { ref } from "vue"
import { computed } from "vue"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "~/composables/i18n"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { Shortcode } from "~/helpers/shortcode/Shortcode"
import IconArrowUpRight from "~icons/lucide/arrow-up-right-square"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconCustomize from "~icons/lucide/settings-2"
import IconTrash2 from "~icons/lucide/trash-2"
import IconGraphql from "~icons/hopp/graphql"
import { shortDateTime } from "~/helpers/utils/date"

const t = useI18n()

const props = defineProps<{
  request: Shortcode
}>()

const emit = defineEmits<{
  (
    e: "customize-shared-request",
    request: HoppRESTRequest | HoppGQLRequest,
    id: string,
    embedProperties?: string | null
  ): void
  (e: "delete-shared-request", codeID: string): void
  (e: "open-shared-request", request: HoppRESTRequest | HoppGQLRequest): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const openInNewTabAction = ref<HTMLButtonElement | null>(null)
const customizeAction = ref<HTMLButtonElement | null>(null)
const deleteAction = ref<HTMLButtonElement | null>(null)
const options = ref<any | null>(null)

// Shape-discriminated parse — GraphQL shortcodes have `query` + `url`,
// REST shortcodes have `endpoint`. We run each through its own translator
// so we get schema defaults regardless of how the payload was stored.
type ParsedShortcode =
  | { protocol: "rest"; request: HoppRESTRequest }
  | { protocol: "gql"; request: HoppGQLRequest }

const parsed = computed<ParsedShortcode>(() => {
  const raw = JSON.parse(props.request.request) as Record<string, unknown>
  if ("query" in raw && "url" in raw && !("endpoint" in raw)) {
    return { protocol: "gql", request: translateToGQLRequest(raw) }
  }
  return { protocol: "rest", request: translateToNewRequest(raw) }
})

const requestLabelColor = computed(() =>
  parsed.value.protocol === "rest"
    ? getMethodLabelColorClassOf(parsed.value.request.method)
    : ""
)

const customizeSharedRequest = () => {
  const embedProperties = props.request.properties
  emit(
    "customize-shared-request",
    parsed.value.request,
    props.request.id,
    embedProperties
  )
}

const deleteSharedRequest = () => {
  emit("delete-shared-request", props.request.id)
}

const timeStamp = computed(() => shortDateTime(props.request.createdOn))
</script>
