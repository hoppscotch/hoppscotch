<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-stretch group"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
      @contextmenu.prevent="options.tippy().show()"
    >
      <span
        class="cursor-pointer flex px-4 items-center justify-center"
        @click="toggleShowChildren()"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
          :name="getCollectionIcon"
        />
      </span>
      <span
        class="cursor-pointer flex flex-1 min-w-0 py-2 pr-2 transition group-hover:text-secondaryDark"
        @click="toggleShowChildren()"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ folder.name ? folder.name : folder.title }}
        </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
          v-tippy="{ theme: 'tooltip' }"
          svg="folder-plus"
          :title="$t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click.native="$emit('add-folder', { folder, path: folderPath })"
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
              @keyup.n="folderAction.$el.click()"
              @keyup.e="edit.$el.click()"
              @keyup.delete="deleteAction.$el.click()"
              @keyup.escape="options.tippy().hide()"
            >
              <SmartItem
                ref="folderAction"
                svg="folder-plus"
                :label="$t('folder.new')"
                :shortcut="['N']"
                @click.native="
                  () => {
                    $emit('add-folder', { folder, path: folderPath })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="edit"
                svg="edit"
                :label="$t('action.edit')"
                :shortcut="['E']"
                @click.native="
                  () => {
                    $emit('edit-folder', {
                      folder,
                      folderIndex,
                      collectionIndex,
                      folderPath: '',
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
    <div v-if="showChildren || isFiltered" class="flex">
      <div
        class="bg-dividerLight cursor-nsResize flex ml-5.5 transform transition w-1 hover:bg-dividerDark hover:scale-x-125"
        @click="toggleShowChildren()"
      ></div>
      <div class="flex flex-col flex-1 truncate">
        <CollectionsTeamsFolder
          v-for="(subFolder, subFolderIndex) in folder.children"
          :key="`subFolder-${subFolderIndex}`"
          :folder="subFolder"
          :folder-index="subFolderIndex"
          :collection-index="collectionIndex"
          :doc="doc"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :folder-path="`${folderPath}/${subFolderIndex}`"
          :picked="picked"
          @add-folder="$emit('add-folder', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @edit-request="$emit('edit-request', $event)"
          @update-team-collections="$emit('update-team-collections')"
          @select="$emit('select', $event)"
          @expand-collection="expandCollection"
          @remove-request="removeRequest"
          @duplicate-request="$emit('duplicate-request', $event)"
        />
        <CollectionsTeamsRequest
          v-for="(request, index) in folder.requests"
          :key="`request-${index}`"
          :request="request.request"
          :collection-index="collectionIndex"
          :folder-index="folderIndex"
          :folder-name="folder.name"
          :request-index="request.id"
          :doc="doc"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :picked="picked"
          :collection-i-d="folder.id"
          @edit-request="$emit('edit-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="removeRequest"
          @duplicate-request="$emit('duplicate-request', $event)"
        />
        <div
          v-if="
            (folder.children == undefined || folder.children.length === 0) &&
            (folder.requests == undefined || folder.requests.length === 0)
          "
          class="flex flex-col text-secondaryLight p-4 items-center justify-center"
        >
          <img
            :src="`/images/states/${$colorMode.value}/pack.svg`"
            loading="lazy"
            class="flex-col object-contain object-center h-16 mb-4 w-16 inline-flex"
            :alt="`${$t('empty.folder')}`"
          />
          <span class="text-center">
            {{ $t("empty.folder") }}
          </span>
        </div>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('confirm.remove_folder')"
      @hide-modal="confirmRemove = false"
      @resolve="removeFolder"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { moveRESTTeamRequest } from "~/helpers/backend/mutations/TeamRequest"
import * as teamUtils from "~/helpers/teams/utils"

export default defineComponent({
  name: "Folder",
  props: {
    folder: { type: Object, default: () => {} },
    folderIndex: { type: Number, default: null },
    collectionIndex: { type: Number, default: null },
    folderPath: { type: String, default: null },
    doc: Boolean,
    saveRequest: Boolean,
    isFiltered: Boolean,
    collectionsType: { type: Object, default: () => {} },
    picked: { type: Object, default: () => {} },
  },
  setup() {
    return {
      tippyActions: ref<any | null>(null),
      options: ref<any | null>(null),
      folderAction: ref<any | null>(null),
      edit: ref<any | null>(null),
      deleteAction: ref<any | null>(null),
    }
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      confirmRemove: false,
      prevCursor: "",
      cursor: "",
    }
  },
  computed: {
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "teams-folder" &&
        this.picked.folderID === this.folder.id
      )
    },
    getCollectionIcon() {
      if (this.isSelected) return "check-circle"
      else if (!this.showChildren && !this.isFiltered) return "folder"
      else if (this.showChildren || this.isFiltered) return "folder-open"
      else return "folder"
    },
  },
  methods: {
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-folder",
            folderID: this.folder.id,
          },
        })

      this.$emit("expand-collection", this.$props.folder.id)
      this.showChildren = !this.showChildren
    },
    removeFolder() {
      if (this.collectionsType.selectedTeam.myRole !== "VIEWER") {
        // Cancel pick if picked collection folder was deleted
        if (
          this.picked &&
          this.picked.pickedType === "teams-folder" &&
          this.picked.folderID === this.folder.id
        ) {
          this.$emit("select", { picked: null })
        }

        teamUtils
          .deleteCollection(this.$apollo, this.folder.id)
          .then(() => {
            this.$toast.success(`${this.$t("state.deleted")}`)
            this.$emit("update-team-collections")
          })
          .catch((e) => {
            this.$toast.error(`${this.$t("error.something_went_wrong")}`)
            console.error(e)
          })
        this.$emit("update-team-collections")
      }
    },
    expandCollection(collectionID) {
      this.$emit("expand-collection", collectionID)
    },
    async dropEvent({ dataTransfer }) {
      this.dragging = !this.dragging
      const requestIndex = dataTransfer.getData("requestIndex")
      const moveRequestResult = await moveRESTTeamRequest(
        requestIndex,
        this.folder.id
      )()
      if (E.isLeft(moveRequestResult))
        this.$toast.error(`${this.$t("error.something_went_wrong")}`)
    },
    removeRequest({ collectionIndex, folderName, requestIndex }) {
      this.$emit("remove-request", {
        collectionIndex,
        folderName,
        requestIndex,
      })
    },
  },
})
</script>
