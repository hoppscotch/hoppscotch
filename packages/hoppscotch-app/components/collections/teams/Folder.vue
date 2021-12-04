<template>
  <div class="flex flex-col">
    <div class="flex items-center group">
      <span
        class="cursor-pointer flex px-4 items-center justify-center"
        @click="toggleShowChildren()"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-green-500': isSelected }"
          :name="getCollectionIcon"
        />
      </span>
      <span
        class="cursor-pointer flex flex-1 min-w-0 py-2 pr-2 transition group-hover:text-secondaryDark"
        @click="toggleShowChildren()"
      >
        <span class="truncate">
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
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <SmartItem
              v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
              svg="folder-plus"
              :label="$t('folder.new')"
              @click.native="
                () => {
                  $emit('add-folder', { folder, path: folderPath })
                  $refs.options.tippy().hide()
                }
              "
            />
            <SmartItem
              v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
              svg="edit"
              :label="$t('action.edit')"
              @click.native="
                () => {
                  $emit('edit-folder', {
                    folder,
                    folderIndex,
                    collectionIndex,
                    folderPath: '',
                  })
                  $refs.options.tippy().hide()
                }
              "
            />
            <SmartItem
              v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
              svg="trash-2"
              color="red"
              :label="$t('action.delete')"
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
          @edit-request="$emit('edit-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="removeRequest"
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
            :alt="$t('empty.folder')"
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

<script>
import { defineComponent } from "@nuxtjs/composition-api"
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
  data() {
    return {
      showChildren: false,
      confirmRemove: false,
      prevCursor: "",
      cursor: "",
    }
  },
  computed: {
    isSelected() {
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
            this.$toast.success(this.$t("state.deleted"))
            this.$emit("update-team-collections")
          })
          .catch((e) => {
            this.$toast.error(this.$t("error.something_went_wrong"))
            console.error(e)
          })
        this.$emit("update-team-collections")
      }
    },
    expandCollection(collectionID) {
      this.$emit("expand-collection", collectionID)
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
