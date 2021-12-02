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
        class="cursor-pointer flex px-2 w-16 items-center justify-center truncate"
        @click="!doc ? selectRequest() : {}"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-green-500': isSelected }"
          :name="isSelected ? 'check-circle' : 'file'"
        />
      </span>
      <span
        class="cursor-pointer flex flex-1 min-w-0 py-2 pr-2 transition group-hover:text-secondaryDark"
        @click="!doc ? selectRequest() : {}"
      >
        <span class="truncate"> {{ request.name }} </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-if="!savingMode"
          v-tippy="{ theme: 'tooltip' }"
          svg="rotate-ccw"
          :title="$t('action.restore')"
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
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <SmartItem
              svg="edit"
              :label="`${$t('action.edit')}`"
              @click.native="
                () => {
                  $emit('edit-request', {
                    request,
                    requestIndex,
                    folderPath,
                  })
                  $refs.options.tippy().hide()
                }
              "
            />
            <SmartItem
              svg="copy"
              :label="`${$t('action.duplicate')}`"
              @click.native="
                () => {
                  $emit('duplicate-request', {
                    request,
                    requestIndex,
                    folderPath,
                  })
                  $refs.options.tippy().hide()
                }
              "
            />
            <SmartItem
              svg="trash-2"
              color="red"
              :label="`${$t('action.delete')}`"
              @click.native="
                () => {
                  confirmRemove = true
                  $refs.options.tippy().hide()
                }
              "
            />
          </tippy>
        </span>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="`${$t('confirm.remove_request')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeRequest"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@nuxtjs/composition-api"
import { HoppGQLRequest, makeGQLRequest } from "~/helpers/types/HoppGQLRequest"
import { removeGraphqlRequest } from "~/newstore/collections"
import { setGQLSession } from "~/newstore/GQLSession"

export default defineComponent({
  props: {
    // Whether the object is selected (show the tick mark)
    picked: { type: Object, default: null },
    // Whether the request is being saved (activate 'select' event)
    savingMode: { type: Boolean, default: false },
    request: { type: Object as PropType<HoppGQLRequest>, default: () => {} },
    folderPath: { type: String, default: null },
    requestIndex: { type: Number, default: null },
    doc: Boolean,
  },
  data() {
    return {
      dragging: false,
      confirmRemove: false,
    }
  },
  computed: {
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "gql-my-request" &&
        this.picked.folderPath === this.folderPath &&
        this.picked.requestIndex === this.requestIndex
      )
    },
  },
  methods: {
    pick() {
      this.$emit("select", {
        picked: {
          pickedType: "gql-my-request",
          folderPath: this.folderPath,
          requestIndex: this.requestIndex,
        },
      })
    },
    selectRequest() {
      if (this.savingMode) {
        this.pick()
      } else {
        setGQLSession({
          request: makeGQLRequest({
            name: this.$props.request.name,
            url: this.$props.request.url,
            query: this.$props.request.query,
            headers: this.$props.request.headers,
            variables: this.$props.request.variables,
          }),
          schema: "",
          response: "",
        })
      }
    },
    dragStart({ dataTransfer }: any) {
      this.dragging = !this.dragging

      dataTransfer.setData("folderPath", this.folderPath)
      dataTransfer.setData("requestIndex", this.requestIndex)
    },
    removeRequest() {
      // Cancel pick if the picked request is deleted
      if (
        this.picked &&
        this.picked.pickedType === "gql-my-request" &&
        this.picked.folderPath === this.folderPath &&
        this.picked.requestIndex === this.requestIndex
      ) {
        this.$emit("select", { picked: null })
      }

      removeGraphqlRequest(this.folderPath, this.requestIndex)
      this.$toast.success(`${this.$t("state.deleted")}`)
    },
  },
})
</script>
