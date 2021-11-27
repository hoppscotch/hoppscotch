<template>
  <div class="flex flex-col">
    <div class="group flex items-center">
      <span
        class="flex items-center justify-center w-16 px-2 truncate cursor-pointer"
        :class="getRequestLabelColor(request.method)"
        @click="!doc ? selectRequest() : {}"
      >
        <SmartIcon
          v-if="isSelected"
          class="svg-icons"
          :class="{ 'text-green-500': isSelected }"
          name="check-circle"
        />
        <span v-else>
          {{ request.method }}
        </span>
      </span>
      <span
        class="group-hover:text-secondaryDark flex items-center flex-1 min-w-0 py-2 pr-2 transition cursor-pointer"
        @click="!doc ? selectRequest() : {}"
      >
        <span class="truncate"> {{ request.name }} </span>
        <span
          v-if="
            active &&
            active.originLocation === 'team-collection' &&
            active.requestID === requestIndex
          "
          class="rounded-full bg-green-500 flex-shrink-0 h-1.5 mx-3 w-1.5"
        ></span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-if="!saveRequest && !doc"
          v-tippy="{ theme: 'tooltip' }"
          svg="rotate-ccw"
          :title="$t('action.restore')"
          class="group-hover:inline-flex hidden"
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
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <SmartItem
              svg="edit"
              :label="$t('action.edit')"
              @click.native="
                $emit('edit-request', {
                  collectionIndex,
                  folderIndex,
                  folderName,
                  request,
                  requestIndex,
                })
                $refs.options.tippy().hide()
              "
            />
            <SmartItem
              svg="trash-2"
              color="red"
              :label="$t('action.delete')"
              @click.native="
                confirmRemove = true
                $refs.options.tippy().hide()
              "
            />
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
import { defineComponent } from "@nuxtjs/composition-api"
import { translateToNewRequest } from "~/helpers/types/HoppRESTRequest"
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
  },
  setup() {
    const active = useReadonlyStream(restSaveContext$, null)
    return {
      active,
    }
  },
  data() {
    return {
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
