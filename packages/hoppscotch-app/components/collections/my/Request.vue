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
        class="flex items-center justify-center w-16 px-2 truncate cursor-pointer"
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
        class="flex items-center flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        @click="!doc ? selectRequest() : {}"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ request.name }}
        </span>
        <span
          v-if="
            active &&
            active.originLocation === 'user-collection' &&
            active.folderPath === folderPath &&
            active.requestIndex === requestIndex
          "
          v-tippy="{ theme: 'tooltip' }"
          class="relative h-1.5 w-1.5 flex flex-shrink-0 mx-3"
          :title="`${$t('collection.request_in_use')}`"
        >
          <span
            class="absolute inline-flex flex-shrink-0 w-full h-full bg-green-500 rounded-full opacity-75 animate-ping"
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
              role="menu"
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
                      folderPath,
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
                      collectionIndex,
                      folderIndex,
                      folderName,
                      request,
                      requestIndex,
                      folderPath,
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
    <HttpApiChangeConfirmModal
      :show="confirmApiChange"
      @hide-modal="confirmApiChange = false"
      @save-change="saveRequestChange"
      @discard-change="discardRequestChange"
    />
    <CollectionsSaveRequest
      mode="rest"
      :show="showSaveRequestModal"
      @hide-modal="showSaveRequestModal = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "@nuxtjs/composition-api"
import {
  safelyExtractRESTRequest,
  translateToNewRequest,
} from "@hoppscotch/data"
import isEqual from "lodash/isEqual"
import * as E from "fp-ts/Either"
import { useReadonlyStream } from "~/helpers/utils/composables"
import {
  getDefaultRESTRequest,
  getRESTRequest,
  restRequest$,
  restSaveContext$,
  setRESTRequest,
  setRESTSaveContext,
  getRESTSaveContext,
} from "~/newstore/RESTSession"
import { editRESTRequest } from "~/newstore/collections"
import { runMutation } from "~/helpers/backend/GQLClient"
import { UpdateRequestDocument } from "~/helpers/backend/graphql"

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
    folderPath: { type: String, default: null },
    picked: { type: Object, default: () => {} },
  },
  setup() {
    const active = useReadonlyStream(restSaveContext$, null)
    const currentFullRequest = useReadonlyStream(restRequest$, getRESTRequest())
    const saveCtx = getRESTSaveContext()

    return {
      active,
      currentFullRequest,
      saveCtx,
      tippyActions: ref<any | null>(null),
      options: ref<any | null>(null),
      edit: ref<any | null>(null),
      duplicate: ref<any | null>(null),
      deleteAction: ref<any | null>(null),
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
      confirmApiChange: false,
      showSaveRequestModal: false,
    }
  },
  computed: {
    isSelected(): boolean {
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
      // checks if current request and clicked request is same
      if (!isEqual(this.request, this.currentFullRequest)) {
        this.confirmApiChange = true
      } else {
        if (
          this.active &&
          this.active.originLocation === "user-collection" &&
          this.active.folderPath === this.folderPath &&
          this.active.requestIndex === this.requestIndex
        ) {
          setRESTSaveContext(null)
          return
        }
        if (this.$props.saveRequest) {
          this.$emit("select", {
            picked: {
              pickedType: "my-request",
              collectionIndex: this.collectionIndex,
              folderPath: this.folderPath,
              folderName: this.folderName,
              requestIndex: this.requestIndex,
            },
          })
        }
        setRESTSaveContext({
          originLocation: "user-collection",
          folderPath: this.folderPath,
          requestIndex: this.requestIndex,
        })
      }
      // else if (
      //   this.active &&
      //   this.active.originLocation === "user-collection" &&
      //   this.active.folderPath === this.folderPath &&
      //   this.active.requestIndex === this.requestIndex
      // ) {
      //   setRESTSaveContext(null)
      // } else if (this.$props.saveRequest) {
      //   this.$emit("select", {
      //     picked: {
      //       pickedType: "my-request",
      //       collectionIndex: this.collectionIndex,
      //       folderPath: this.folderPath,
      //       folderName: this.folderName,
      //       requestIndex: this.requestIndex,
      //     },
      //   })
      //   setRESTSaveContext({
      //     originLocation: "user-collection",
      //     folderPath: this.folderPath,
      //     requestIndex: this.requestIndex,
      //   })
      // }
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
    getRequestLabelColor(method: string): string {
      return (
        this.requestMethodLabels[method.toLowerCase()] ||
        this.requestMethodLabels.default
      )
    },
    // save-request
    saveCurrentRequest() {
      console.log("context", this.saveCtx, this.active)

      if (!this.active) {
        this.showSaveRequestModal = true
        return
      }
      if (this.active.originLocation === "user-collection") {
        try {
          editRESTRequest(
            this.active.folderPath,
            this.active.requestIndex,
            getRESTRequest()
          )
          this.$toast.success(this.t("request.saved"))
        } catch (e) {
          setRESTSaveContext(null)
          // this.saveCurrentRequest()
        }
      } else if (this.active.originLocation === "team-collection") {
        const req = getRESTRequest()

        // TODO: handle error case (NOTE: overwriteRequestTeams is async)
        try {
          runMutation(UpdateRequestDocument, {
            requestID: this.active.requestID,
            data: {
              title: req.name,
              request: JSON.stringify(req),
            },
          })().then((result) => {
            if (E.isLeft(result)) {
              this.$toast.error(this.$t("profile.no_permission"))
            } else {
              this.$toast.success(this.$t("request.saved"))
            }
          })
        } catch (error) {
          this.showSaveRequestModal = true
          this.$toast.error(this.$t("error.something_went_wrong"))
          console.error(error)
        }
      }
    },
    saveRequestChange() {
      this.saveCurrentRequest()
      setRESTRequest(
        safelyExtractRESTRequest(
          translateToNewRequest(this.request),
          getDefaultRESTRequest()
        ),
        {
          originLocation: "user-collection",
          folderPath: this.folderPath,
          requestIndex: this.requestIndex,
        }
      )
      this.confirmApiChange = false
    },
    discardRequestChange() {
      console.log(
        "donot=save-context",
        this.saveCtx,
        this.active,
        this.$props.saveRequest
      )

      setRESTRequest(
        safelyExtractRESTRequest(
          translateToNewRequest(this.request),
          getDefaultRESTRequest()
        ),
        {
          originLocation: "user-collection",
          folderPath: this.folderPath,
          requestIndex: this.requestIndex,
        }
      )
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
      setRESTSaveContext({
        originLocation: "user-collection",
        folderPath: this.folderPath,
        requestIndex: this.requestIndex,
      })
      this.confirmApiChange = false
    },
  },
})
</script>
