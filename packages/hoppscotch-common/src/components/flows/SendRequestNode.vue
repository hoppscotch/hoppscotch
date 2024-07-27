<template>
  <div class="bg-primary rounded border border-dividerLight p-2">
    <div>
      <button
        class="w-full flex gap-2 cursor-text items-center justify-between rounded bg-primaryDark px-2 py-1.5 text-secondaryLight transition hover:border-dividerDark hover:bg-primaryLight hover:text-secondary"
        @click="
          () => {
            showRequestSelector = true
          }
        "
      >
        <icon-lucide-link v-if="currentRequest === null" class="svg-icons" />

        <span
          v-else
          :style="{ color: getMethodLabelColorClassOf(currentRequest) }"
          class="text-tiny font-semibold"
        >
          {{ currentRequest.method }}
        </span>

        <span v-if="currentRequest === null" class="flex flex-1 text-tiny">
          {{ t("flows.select_request") }}
        </span>

        <span v-else class="flex flex-1 text-tiny">
          {{ currentRequest.name }}
        </span>
      </button>

      <template v-if="showRequestSelector">
        <div
          class="flex items-center whitespace-nowrap border-b border-dividerLight px-1 py-2 text-tiny text-secondaryLight"
        >
          <span
            class="truncate cursor-pointer hover:text-secondaryDark"
            @click="
              () => {
                if (currentCollection)
                  currentCollection = currentCollection.parent
              }
            "
          >
            {{
              currentCollection?.parent
                ? currentCollection.parent.value.name
                : workspaceName
            }}
          </span>
          <icon-lucide-chevron-right v-if="currentCollection" class="mx-2" />
          <span v-if="currentCollection">
            {{ currentCollection.value.name }}
          </span>
        </div>

        <div class="flex flex-col px-1 py-1">
          <div
            v-for="item of currentCollection
              ? currentCollection.value.folders
              : collections"
            :key="item.id"
            class="flex gap-8 h-7 items-center group cursor-pointer"
            @click="
              () => {
                currentCollection = {
                  parent: currentCollection,
                  value: item,
                }
              }
            "
          >
            <icon-lucide-folder class="w-4" />
            <span class="text-tiny group-hover:text-secondaryDark">
              {{ item.name }}
            </span>
          </div>

          <div
            v-for="item of currentCollection
              ? (currentCollection.value.requests as HoppRESTRequest[])
              : []"
            :key="item.id"
            class="flex gap-8 h-7 items-center group cursor-pointer"
            @click="
              () => {
                currentRequest = item
                showRequestSelector = false
              }
            "
          >
            <span
              :style="{ color: getMethodLabelColorClassOf(item) }"
              class="text-tiny font-semibold w-4"
            >
              {{ item.method }}
            </span>
            <span class="text-tiny group-hover:text-secondaryDark">
              {{ item.name }}
            </span>
          </div>
        </div>
      </template>
    </div>

    <div v-if="currentRequest && currentRequest.params.length">
      <div
        class="border-b border-dividerLight mb-3"
        :class="[showRequestSelector ? 'mt-1' : 'mt-3']"
      />

      <div class="flex flex-col text-tiny px-1 gap-1 items-end">
        <span>{{ t("flows.success") }}</span>
        <span>{{ t("flows.failure") }}</span>
      </div>

      <Handle
        id="source-success"
        type="source"
        :position="Position.Right"
        :style="{
          top: 'auto',
          bottom: handlePositions.success + 'px',
        }"
      />

      <Handle
        id="source-failure"
        type="source"
        :position="Position.Right"
        :style="{
          top: 'auto',
          bottom: handlePositions.failure + 'px',
        }"
      />

      <div class="border-b border-dividerLight my-3" />

      <div class="flex flex-col gap-2">
        <div
          v-for="(param, i) of currentRequest.params"
          :key="param.key"
          class="flex items-center justify-between pl-1"
        >
          <span class="text-tiny w-16">{{ param.key }}</span>
          <span
            class="text-tiny bg-primaryDark px-2 rounded w-16 text-center"
            >{{ param.value }}</span
          >

          <Handle
            :id="`target-${param.key}`"
            type="target"
            :position="Position.Left"
            :style="{
              top: 'auto',
              bottom:
                handlePositions.paramBottom +
                handlePositions.paramOffset *
                  (currentRequest.params.length - 1 - i) +
                'px',
            }"
          />
        </div>
      </div>
    </div>
  </div>

  <Handle
    id="target-from"
    type="target"
    :position="Position.Left"
    :style="{
      top: handlePositions.from + 'px',
    }"
  />
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from "vue"
import { useService } from "dioc/vue"
import { Handle, Position } from "@vue-flow/core"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { useI18n } from "~/composables/i18n"
import { WorkspaceService } from "~/services/workspace.service"

defineProps<{
  data: {
    label: string
  }
  collections: HoppCollection[]
}>()

type HoppCollectionWithParent = {
  value: HoppCollection
  parent: HoppCollectionWithParent | null
}

const currentCollection = ref<HoppCollectionWithParent | null>(null)
const currentRequest = ref<HoppRESTRequest | null>(null)
const showRequestSelector = ref(false)

const t = useI18n()

const workspaceService = useService(WorkspaceService)
const workspace = workspaceService.currentWorkspace

const workspaceName = computed(() => {
  if (workspace.value.type === "personal") {
    return t("workspace.personal")
  }

  if (workspace.value.type === "team" && workspace.value.teamName) {
    return workspace.value.teamName
  }

  return `${t("workspace.team")}`
})

const handlePositions = {
  from: 24,
  paramBottom: 3,
  paramOffset: 24,
  success: 114,
  failure: 93,
}

watchEffect(() => {
  console.log("xd", currentRequest.value)
})
</script>
