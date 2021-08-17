<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-center group"
      draggable="true"
      @dragstart="dragStart"
      @dragover.stop
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <span
        class="
          cursor-pointer
          flex
          mx-2
          w-12
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
          group-hover:text-secondaryDark
        "
        @click="!doc ? selectRequest() : {}"
      >
        <span class="truncate"> {{ request.name }} </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-if="!saveRequest && !doc"
          v-tippy="{ theme: 'tooltip' }"
          icon="replay"
          :title="$t('restore')"
          class="hidden group-hover:inline-flex"
          @click.native="!doc ? selectRequest() : {}"
        />
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            arrow
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('more')"
                icon="more_vert"
              />
            </template>
            <SmartItem
              icon="edit"
              :label="$t('edit')"
              @click.native="
                $emit('edit-request', {
                  collectionIndex,
                  folderIndex,
                  folderName,
                  request,
                  requestIndex,
                  folderPath,
                })
                $refs.options.tippy().hide()
              "
            />
            <SmartItem
              icon="remove_circle_outline"
              color="red"
              :label="$t('delete')"
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

<script>
import { translateToNewRequest } from "~/helpers/types/HoppRESTRequest"
import { setRESTRequest } from "~/newstore/RESTSession"

export default {
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
    folderPath: { type: String, default: null },
    picked: { type: Object, default: () => {} },
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
    isSelected() {
      return (
        this.picked &&
        this.picked.pickedType === "my-request" &&
        this.picked.folderPath === this.folderPath &&
        this.picked.requestIndex === this.requestIndex
      )
    },
  },
  methods: {
    selectRequest() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "my-request",
            collectionIndex: this.collectionIndex,
            folderPath: this.folderPath,
            folderName: this.folderName,
            requestIndex: this.requestIndex,
          },
        })
      else setRESTRequest(translateToNewRequest(this.request))
    },
    dragStart({ dataTransfer }) {
      this.dragging = !this.dragging
      dataTransfer.setData("folderPath", this.folderPath)
      dataTransfer.setData("requestIndex", this.requestIndex)
    },
    removeRequest() {
      this.$emit("remove-request", {
        collectionIndex: this.$props.collectionIndex,
        folderName: this.$props.folderName,
        folderPath: this.folderPath,
        requestIndex: this.$props.requestIndex,
      })
    },
    getRequestLabelColor(method) {
      return (
        this.requestMethodLabels[method.toLowerCase()] ||
        this.requestMethodLabels.default
      )
    },
  },
}
</script>
