<template>
  <div class="flex flex-col">
    <div class="flex items-center group">
      <span
        class="
          cursor-pointer
          flex
          px-2
          w-16
          justify-center
          items-center
          truncate
        "
        :class="getRequestLabelColor(request.method)"
        @click="!doc ? selectRequest() : {}"
      >
        <i
          v-if="isSelected"
          class="material-icons"
          :class="{ 'text-green-500': isSelected }"
        >
          check_circle_outline
        </i>
        <span v-else>
          {{ request.method }}
        </span>
      </span>
      <span
        class="
          cursor-pointer
          flex flex-1
          min-w-0
          py-2
          pr-2
          transition
          items-center
          group-hover:text-secondaryDark
        "
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
          icon="replay"
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
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.more')"
                icon="more_vert"
              />
            </template>
            <SmartItem
              icon="edit"
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
              icon="delete"
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
