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
          px-2
          w-16
          justify-center
          items-center
          truncate
          text-gray-500
        "
        @click="!doc ? selectRequest() : {}"
      >
        <span class="truncate">
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
        <span class="truncate">
          {{ request.examples[exampleIndex].name }}
        </span>
      </span>
      <div class="flex">
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
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <SmartItem
              svg="edit"
              :label="$t('action.edit')"
              @click.native="
                $emit('edit-example', {
                  collectionIndex,
                  folderIndex,
                  folderName,
                  request,
                  requestIndex,
                  exampleIndex,
                  folderPath,
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

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { translateToNewRequest } from "~/helpers/types/HoppRESTRequest"
import { HoppSessionType } from "~/helpers/types/HoppSessionType"
import { toRequest } from "~/helpers/types/HoppRESTExample"
import { useReadonlyStream } from "~/helpers/utils/composables"
import {
  restSaveContext$,
  setRESTRequest,
  // setRESTSaveContext,
  setRESTSessionType,
  updateRESTResponse,
} from "~/newstore/RESTSession"

export default defineComponent({
  props: {
    request: { type: Object, default: () => {} },
    collectionIndex: { type: Number, default: null },
    folderIndex: { type: Number, default: null },
    folderName: { type: String, default: null },
    // eslint-disable-next-line vue/require-default-prop
    requestIndex: [Number, String],
    exampleIndex: { type: Number, default: null },
    doc: Boolean,
    saveRequest: Boolean,
    collectionsType: { type: Object, default: () => {} },
    folderPath: { type: String, default: null },
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
      dragging: false,
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
      setRESTSessionType(HoppSessionType.Example)
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "my-example",
            collectionIndex: this.collectionIndex,
            folderPath: this.folderPath,
            folderName: this.folderName,
            requestIndex: this.requestIndex,
            exampleIndex: this.exampleIndex,
          },
        })
      else {
        setRESTRequest(translateToNewRequest(this.request), {
          originLocation: "user-collection",
          folderPath: this.folderPath,
          requestIndex: this.requestIndex,
        })
        if (this.exampleIndex >= this.request.examples.length) {
          return
        }
        const example = this.request.examples[this.exampleIndex]

        updateRESTResponse(example.response)
        setRESTRequest(toRequest(example))
      }
    },
    dragStart({ dataTransfer }) {
      this.dragging = !this.dragging
      dataTransfer.setData("folderPath", this.folderPath)
      dataTransfer.setData("requestIndex", this.requestIndex)
    },
    removeRequest() {
      this.$emit("remove-example", {
        collectionIndex: this.$props.collectionIndex,
        folderName: this.$props.folderName,
        folderPath: this.folderPath,
        requestIndex: this.$props.requestIndex,
        exampleIndex: this.exampleIndex,
      })
    },
    getRequestLabelColor(method) {
      return (
        this.requestMethodLabels[method.toLowerCase()] ||
        this.requestMethodLabels.default
      )
    },
  },
})
</script>
