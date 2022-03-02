<template>
  <AppPaneLayout>
    <template #primary>
      <div class="flex items-start justify-between p-4">
        <label>
          {{ $t("documentation.generate_message") }}
        </label>
        <span
          class="inline-flex px-2 py-1 rounded bg-accentDark text-accentContrast"
        >
          BETA
        </span>
      </div>
      <div
        class="sticky top-0 z-10 flex items-start justify-between border-b bg-primary border-dividerLight"
      >
        <label for="collectionUpload">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            title="JSON"
            svg="folder"
            class="!rounded-none"
            :label="$t('import.collections')"
            @click.native="$refs.collectionUpload.click()"
          />
        </label>
        <input
          ref="collectionUpload"
          class="input"
          name="collectionUpload"
          type="file"
          @change="uploadCollection"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.clear')"
          svg="trash-2"
          @click.native="collectionJSON = '[]'"
        />
      </div>
      <textarea-autosize
        id="import-curl"
        v-model="collectionJSON"
        class="w-full p-4 font-mono bg-primary"
        autofocus
        rows="8"
      />
      <div
        class="sticky bottom-0 z-10 flex items-start justify-between p-4 border-t border-b bg-primary border-dividerLight"
      >
        <ButtonPrimary
          :label="$t('documentation.generate')"
          @click.native="getDoc"
        />
      </div>
    </template>
    <template #secondary>
      <div class="flex flex-col">
        <div
          v-if="items.length === 0"
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <i class="pb-2 opacity-75 material-icons">topic</i>
          <span class="text-center">
            {{ $t("helpers.generate_documentation_first") }}
          </span>
        </div>
        <div
          v-else
          class="sticky top-0 z-10 flex flex-1 p-4 border-b bg-primary border-dividerLight"
        >
          <span
            v-tippy="{ theme: 'tooltip' }"
            :title="
              !currentUser
                ? $t('export.require_github')
                : currentUser.provider !== 'github.com'
                ? $t('export.require_github')
                : 'Beta'
            "
          >
            <ButtonPrimary
              :disabled="
                !currentUser
                  ? true
                  : currentUser.provider !== 'github.com'
                  ? true
                  : false
              "
              :label="$t('export.create_secret_gist')"
              @click.native="createDocsGist"
            />
          </span>
        </div>
        <div v-for="(collection, index) in items" :key="`collection-${index}`">
          <DocsCollection :collection="collection" />
        </div>
      </div>
    </template>
    <template #sidebar>
      <aside>
        <Collections
          :selected="selected"
          :doc="true"
          @use-collection="useSelectedCollection($event)"
          @remove-collection="removeSelectedCollection($event)"
        />
      </aside>
    </template>
  </AppPaneLayout>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import Mustache from "mustache"
import { currentUser$ } from "~/helpers/fb/auth"
import DocsTemplate from "~/assets/md/docs.md"
import folderContents from "~/assets/md/folderContents.md"
import folderBody from "~/assets/md/folderBody.md"
import { useReadonlyStream } from "~/helpers/utils/composables"

export default defineComponent({
  setup() {
    return {
      currentUser: useReadonlyStream(currentUser$, null),
    }
  },
  data() {
    return {
      collectionJSON: "[]",
      items: [],
      docsMarkdown: "",
      selected: [],
    }
  },
  head() {
    return {
      title: `${this.$t("navigation.doc")} • Hoppscotch`,
    }
  },
  methods: {
    async createDocsGist() {
      await this.$axios
        .$post(
          "https://api.github.com/gists",
          {
            files: {
              "api-docs.md": {
                content: this.docsMarkdown,
              },
            },
          },
          {
            headers: {
              Authorization: `token ${this.currentUser.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )
        .then((res) => {
          this.$toast.success(this.$t("export.gist_created"))
          window.open(res.html_url)
        })
        .catch((e) => {
          this.$toast.error(this.$t("error.something_went_wrong"))
          console.error(e)
        })
    },

    uploadCollection() {
      const file = this.$refs.collectionUpload.files[0]
      if (file !== undefined && file !== null) {
        const reader = new FileReader()
        reader.onload = ({ target }) => {
          this.collectionJSON = target.result
        }
        reader.readAsText(file)
        this.$toast.success(this.$t("state.file_imported"))
      } else {
        this.$toast.error(this.$t("action.choose_file"))
      }
      this.$refs.collectionUpload.value = ""
    },

    assignIDs(items, pref, nestingLevel) {
      for (let i = 0; i < items.length; ++i) {
        items[i].id = `&emsp;${pref}${i + 1}.`
        items[i].ref = `${items[i].name.split(" ").join("-")}`
        items[i].nestingLevel = nestingLevel
        items[i].folders = this.assignIDs(
          items[i].folders,
          items[i].id,
          nestingLevel + "#"
        )
        for (let j = 0; j < items[i].requests.length; ++j) {
          items[i].requests[j].id = `&emsp;${items[i].id}${i + 1}`
          items[i].requests[j].ref = `${items[i].requests[j].name
            .split(" ")
            .join("-")}`
          items[i].requests[j].nestingLevel = nestingLevel + "#"
        }
      }
      return items
    },

    getDoc() {
      try {
        this.items = JSON.parse(this.collectionJSON)
        this.assignIDs(this.items, "", "#")
        this.$toast.clear()
        this.$toast.success(this.$t("state.docs_generated"))
        const docsMarkdown = Mustache.render(
          DocsTemplate,
          {
            collections: this.items,
            isHeaders() {
              return this.headers.length
            },
            isParams() {
              return this.params.length
            },
            isAuth() {
              return this.auth !== "None"
            },
            isAuthBasic() {
              return this.httpUser && this.httpPassword
            },
            isRawParams() {
              return this.rawParams && this.rawParams !== ""
            },
            isPreRequestScript() {
              return this.preRequestScript && this.preRequestScript !== ""
            },
            isTestScript() {
              return this.testScript && this.testScript !== ""
            },
          },
          {
            folderContents,
            folderBody,
          }
        )
        this.docsMarkdown = docsMarkdown.replace(/^\s*[\r\n]/gm, "\n\n")
      } catch (e) {
        console.error(e)
        this.$toast.error(this.$t("error.something_went_wrong"))
      }
    },

    useSelectedCollection(collection) {
      if (this.selected.find((coll) => coll === collection)) {
        return
      }
      this.selected.push(collection)
      const importCollection = JSON.stringify(this.selected, null, 2)
      this.collectionJSON = JSON.stringify(
        JSON.parse(importCollection),
        null,
        2
      )
    },

    removeSelectedCollection(collection) {
      this.selected = this.selected.filter((coll) => coll !== collection)
      const importCollection = JSON.stringify(this.selected, null, 2)
      this.collectionJSON = JSON.stringify(
        JSON.parse(importCollection),
        null,
        2
      )
    },
  },
})
</script>
