<template>
  <div
    class="bg-primary rounded border border-dividerLight p-2"
    :class="{
      'animate-pulse': data.loading,
    }"
  >
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

    <div v-if="currentRequest">
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
          bottom:
            handlePositions.paramBottom +
            handlePositions.paramOffset * currentRequest.params.length +
            handlePositions.success +
            (currentRequest.params.length == 0
              ? handlePositions.noParamsOffset
              : 0) +
            'px',
        }"
      />

      <Handle
        id="source-failure"
        type="source"
        :position="Position.Right"
        :style="{
          top: 'auto',
          bottom:
            handlePositions.paramBottom +
            handlePositions.paramOffset * currentRequest.params.length +
            handlePositions.failure +
            (currentRequest.params.length == 0
              ? handlePositions.noParamsOffset
              : 0) +
            'px',
        }"
      />
    </div>

    <div v-if="currentRequest && currentRequest.params.length">
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
            :id="`target-param-${param.key}`"
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
import { ref, computed, watch } from "vue"
import { useService } from "dioc/vue"
import {
  Handle,
  Position,
  useVueFlow,
  useHandleConnections,
  useNodesData,
} from "@vue-flow/core"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { useI18n } from "~/composables/i18n"
import { WorkspaceService } from "~/services/workspace.service"

const props = defineProps<{
  id: string
  data: {
    loading: boolean
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
  success: 40,
  failure: 18,
  noParamsOffset: -16,
}

const { updateNodeData, getConnectedEdges } = useVueFlow()

const handleConnections = useHandleConnections({
  id: "target-from",
  type: "target",
})

const nodesData = useNodesData(() =>
  handleConnections.value.map((connection) => connection.source)
)

watch([nodesData], async () => {
  const edges = getConnectedEdges(props.id).map((edge) => ({
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    data: edge.sourceNode.data,
  }))

  const overrideParams: any = {}

  let sourceLoading

  for (const edge of edges) {
    if (edge.targetHandle?.startsWith("target-param-")) {
      const paramKey = edge.targetHandle.substring("target-param-".length)
      const sourceKey = edge.sourceHandle!.substring("source-".length)
      overrideParams[paramKey] = edge.data[sourceKey]
    } else if (edge.targetHandle === "target-from") {
      sourceLoading = edge.data.loading
    }
  }

  if (!sourceLoading && !props.data.loading && currentRequest.value) {
    updateNodeData(props.id, {
      loading: true,
      responseData: null,
    })

    const request = currentRequest.value
    const params = request.params.reduce(
      (params, kvp) => ({
        ...params,
        [kvp.key]: overrideParams[kvp.key] ?? kvp.value,
      }),
      {}
    )

    const response = await fetch(
      request.endpoint + "?" + new URLSearchParams(params),
      {
        method: request.method,
      }
    )

    const responseData = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: await response.json(),
    }

    updateNodeData(props.id, {
      loading: false,
      responseData,
    })
  }
})
</script>
