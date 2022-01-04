<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-stretch group"
      draggable="true"
      @dragstart="dragStart"
      @dragover.stop
      @dragleave="dragging = false"
      @dragend="dragging = false"
      @contextmenu.prevent="options.tippy().show()"
    >
      <span
        class="cursor-pointer flex px-2 w-16 items-center justify-center truncate"
        :class="getRequestLabelColor(request.method)"
        @click="!doc ? selectRequest() : {}"
      >
        <SmartIcon
          v-if="isSelected"
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
          name="check-circle"
        />
        <span v-else class="truncate">
          {{ request.method }}
        </span>
      </span>
      <span
        class="cursor-pointer flex flex-1 min-w-0 py-2 pr-2 transition items-center group-hover:text-secondaryDark"
        @click="!doc ? selectRequest() : {}"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ request.name }}
        </span>
        <span
          v-if="
            active &&
            active.originLocation === 'team-collection' &&
            active.requestID === requestIndex
          "
          v-tippy="{ theme: 'tooltip' }"
          class="relative h-1.5 w-1.5 flex flex-shrink-0 mx-3"
          :title="`${$t('collection.request_in_use')}`"
        >
          <span
            class="absolute animate-ping inline-flex flex-shrink-0 h-full w-full rounded-full bg-green-500 opacity-75"
          >
          </span>
          <span
            class="relative inline-flex flex-shrink-0 rounded-full h-1.5 w-1.5 bg-green-500"
          ></span>
        </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-if="!saveRequest && !doc"
          v-tippy="{ theme: 'tooltip' }"
          svg="rotate-ccw"
          :title="$t('action.restore')"
          class="hidden group-hover:inline-flex"
          @click.native="!doc ? selectRequest() : {}"
        />
        <span>
          <tippy
            v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            arrow
            :on-shown="() => tippyActions.focus()"
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.e="edit.$el.click()"
              @keyup.d="duplicate.$el.click()"
              @keyup.delete="deleteAction.$el.click()"
              @keyup.escape="options.tippy().hide()"
            >
              <SmartItem
                ref="edit"
                svg="edit"
                :label="$t('action.edit')"
                :shortcut="['E']"
                @click.native="
                  () => {
                    $emit('edit-request', {
                      collectionIndex,
                      folderIndex,
                      folderName,
                      request,
                      requestIndex,
                    })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="duplicate"
                svg="copy"
                :label="$t('action.duplicate')"
                :shortcut="['D']"
                @click.native="
                  () => {
                    $emit('duplicate-request', {
                      request,
                      requestIndex,
                      collectionID,
                    })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="deleteAction"
                svg="trash-2"
                :label="$t('action.delete')"
                :shortcut="['⌫']"
                @click.native="
                  () => {
                    confirmRemove = true
                    options.tippy().hide()
                  }
                "
              />
            </div>
          </tippy>
        </span>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('confirm.remove_request')"
      @hide-modal="confirmRemove = false"
      @resolve="removeRequest"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "@nuxtjs/composition-api"
import { translateToNewRequest } from "@hoppscotch/data"
import { useReadonlyStream } from "~/helpers/utils/composables"
import {
  restSaveContext$,
  setRESTRequest,
  setRESTSaveContext,
} from "~/newstore/RESTSession"

export default defineComponent({
  props: {
    request: { type: Object, default: () => {} },
    collectionIndex: { type: Number, default: null },
    folderIndex: { type: Number, default: null },
    folderName: { type: String, default: null },
    // eslint-disable-next-line vue/require-default-prop
    requestIndex: [Number, String],
    doc: Boolean,
    saveRequest: Boolean,
    collectionsType: { type: Object, default: () => {} },
    picked: { type: Object, default: () => {} },
    collectionID: { type: String, default: null },
  },
  setup() {
    const active = useReadonlyStream(restSaveContext$, null)
    return {
      active,
      tippyActions: ref<any | null>(null),
      options: ref<any | null>(null),
      edit: ref<any | null>(null),
      deleteAction: ref<any | null>(null),
      duplicate: ref<any | null>(null),
    }
  },
  data() {
    return {
      dragging: false,
      requestMethodLabels: {
        get: "text-green-500",
        post: "text-yellow-500",
        put: "text-blue-500",
        delete: "text-red-500",
        default: "text-gray-500",
      },
      confirmRemove: false,
    }
  },
  computed: {
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "teams-request" &&
        this.picked.requestID === this.requestIndex
      )
    },
  },
  methods: {
    selectRequest() {
      if (
        this.active &&
        this.active.originLocation === "team-collection" &&
        this.active.requestID === this.requestIndex
      ) {
        setRESTSaveContext(null)
        return
      }
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-request",
            requestID: this.requestIndex,
          },
        })
      else
        setRESTRequest(translateToNewRequest(this.request), {
          originLocation: "team-collection",
          requestID: this.requestIndex as string,
        })
    },
    dragStart({ dataTransfer }) {
      this.dragging = !this.dragging
      dataTransfer.setData("requestIndex", this.requestIndex)
    },
    removeRequest() {
      this.$emit("remove-request", {
        collectionIndex: this.$props.collectionIndex,
        folderName: this.$props.folderName,
        requestIndex: this.$props.requestIndex,
      })
    },
    getRequestLabelColor(method: any) {
      return (
        (this.requestMethodLabels as any)[method.toLowerCase()] ||
        this.requestMethodLabels.default
      )
    },
  },
})
</script>
