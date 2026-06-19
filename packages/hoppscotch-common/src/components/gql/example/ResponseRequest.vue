<template>
  <div
    class="sticky top-0 z-20 flex-none flex-shrink-0 bg-primary p-4 sm:flex sm:flex-shrink-0 sm:space-x-2"
  >
    <div
      class="min-w-[12rem] flex flex-1 whitespace-nowrap rounded border border-divider"
    >
      <div
        class="flex w-26 cursor-default rounded-l bg-primaryLight px-4 py-2 font-semibold text-secondaryDark"
      >
        GQL
      </div>
      <div
        class="flex flex-1 whitespace-nowrap rounded-r border-l border-divider bg-primaryLight transition"
      >
        <SmartEnvInput
          v-model="tab.document.response.originalRequest.url"
          :placeholder="`${t('request.url_placeholder')}`"
          :auto-complete-env="true"
        />
      </div>
    </div>
    <div class="mt-2 flex sm:mt-0 items-stretch space-x-2">
      <HoppButtonPrimary
        v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
        title="Try"
        label="Try"
        class="min-w-[5rem] flex-1"
        @click="tryExampleResponse"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
        :title="`${t(
          'request.save'
        )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
        label="Save"
        filled
        :icon="IconSave"
        class="flex-1 rounded"
        @click="saveExample"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { cloneDeep } from "lodash-es"
import IconSave from "~icons/lucide/save"
import * as E from "fp-ts/Either"

import {
  HoppGQLRequest,
  HoppGQLRequestResponse,
  getDefaultGQLRequest,
} from "@hoppscotch/data"

import { HoppTab } from "~/services/tab"
import { HoppSavedGQLExampleDocument } from "~/helpers/rest/document"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { editRESTRequest, restCollections$ } from "~/newstore/collections"
import { useReadonlyStream } from "~/composables/stream"
import { getRequestsByPath } from "~/helpers/collection/request"
import { useToast } from "@composables/toast"
import { defineActionHandler } from "~/helpers/actions"
import { runMutation } from "~/helpers/backend/GQLClient"
import { UpdateRequestDocument } from "~/helpers/backend/graphql"
import { getSingleRequest } from "~/helpers/teams/TeamRequest"

const t = useI18n()
const toast = useToast()
const tabs = useService(WorkspaceTabsService)
const myCollections = useReadonlyStream(restCollections$, [], "deep")

const props = defineProps<{
  modelValue: HoppTab<HoppSavedGQLExampleDocument>
}>()
const emit = defineEmits(["update:modelValue"])
const tab = useVModel(props, "modelValue", emit)

// "Try" opens the captured original request as a brand-new GQL tab so the user
// can run it again without mutating the example. Mirrors the REST flow.
const tryExampleResponse = () => {
  const orig = tab.value.document.response.originalRequest
  tabs.createNewTab({
    isDirty: false,
    type: "gql-request",
    request: {
      ...getDefaultGQLRequest(),
      name: orig.name,
      url: orig.url,
      query: orig.query,
      variables: orig.variables,
      headers: orig.headers,
      auth: orig.auth,
    },
    cursorPosition: 0,
    inheritedProperties: tab.value.document.inheritedProperties,
  })
}

const saveExample = async () => {
  const saveCtx = tab.value.document.saveContext
  if (!saveCtx) return

  const response: HoppGQLRequestResponse = cloneDeep(
    tab.value.document.response
  )

  if (saveCtx.originLocation === "user-collection") {
    // Unified workspace: GQL requests live in REST collection rows on the
    // backend, so the local store path is the REST collection store too.
    const request = cloneDeep(
      getRequestsByPath(myCollections.value, saveCtx.folderPath)[
        saveCtx.requestIndex!
      ] as unknown as HoppGQLRequest
    )

    if (!request) return

    request.responses = {
      ...(request.responses ?? {}),
      [response.name]: response,
    }

    try {
      editRESTRequest(saveCtx.folderPath, saveCtx.requestIndex!, request)
      tab.value.document.isDirty = false
      toast.success(`${t("response.saved")}`)
    } catch (e) {
      console.error(e)
    }
    return
  }

  if (saveCtx.originLocation === "team-collection") {
    const request = await getSingleRequest(saveCtx.requestID)

    if (E.isLeft(request) || !request.right.request) {
      toast.error(`${t("error.something_went_wrong")}`)
      return
    }

    const parsedRequest: HoppGQLRequest = JSON.parse(
      request.right.request.request
    )
    parsedRequest.responses = {
      ...(parsedRequest.responses ?? {}),
      [response.name]: response,
    }

    runMutation(UpdateRequestDocument, {
      requestID: saveCtx.requestID,
      data: {
        title: parsedRequest.name,
        request: JSON.stringify(parsedRequest),
      },
    })().then((result) => {
      if (E.isLeft(result)) {
        toast.error(`${t("profile.no_permission")}`)
      } else {
        tab.value.document.isDirty = false
        toast.success(`${t("response.saved")}`)
      }
    })
  }
}

defineActionHandler("request-response.save", saveExample)
</script>
