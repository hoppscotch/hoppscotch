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
        @click="!doc ? selectRequest() : {}"
      >
        <i class="material-icons" :class="{ 'text-green-500': isSelected }">
          {{ isSelected ? "check_circle_outline" : "description" }}
        </i>
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
          v-if="!savingMode"
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

<script lang="ts">
import Vue from "vue"
import { removeGraphqlRequest } from "~/newstore/collections"
import { setGQLSession } from "~/newstore/GQLSession"

export default Vue.extend({
  props: {
    // Whether the object is selected (show the tick mark)
    picked: { type: Object, default: null },
    // Whether the request is being saved (activate 'select' event)
    savingMode: { type: Boolean, default: false },
    request: { type: Object, default: () => {} },
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
          name: this.$props.request.name,
          url: this.$props.request.url,
          query: this.$props.request.query,
          headers: this.$props.request.headers,
          variables: this.$props.request.variables,
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
      this.$toast.error(this.$t("deleted").toString(), {
        icon: "delete",
      })
    },
  },
})
</script>
