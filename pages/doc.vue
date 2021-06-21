<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <AppSection label="import">
          <div class="flex flex-col">
            <label>{{ $t("collection") }}</label>
            <p class="info">
              {{ $t("generate_docs_message") }}
            </p>
            <div class="row-wrapper">
              <label for="collectionUpload">
                <button
                  v-tooltip="'JSON'"
                  class="icon"
                  @click="$refs.collectionUpload.click()"
                >
                  <i class="material-icons">folder</i>
                  <span>{{ $t("import_collections") }}</span>
                </button>
              </label>
              <input
                ref="collectionUpload"
                name="collectionUpload"
                type="file"
                @change="uploadCollection"
              />
              <div>
                <button
                  v-tooltip.bottom="$t('clear')"
                  class="icon"
                  @click="collectionJSON = '[]'"
                >
                  <i class="material-icons">clear_all</i>
                </button>
              </div>
            </div>
            <SmartAceEditor
              v-model="collectionJSON"
              :lang="'json'"
              :lint="false"
              :options="{
                maxLines: '16',
                minLines: '8',
                fontSize: '15px',
                autoScrollEditorIntoView: true,
                showPrintMargin: false,
                useWorker: false,
              }"
            />
            <button class="icon" @click="getDoc">
              <i class="material-icons">topic</i>
              <span>{{ $t("generate_docs") }}</span>
            </button>
          </div>
        </AppSection>

        <AppSection label="documentation">
          <div class="flex flex-col">
            <label>{{ $t("documentation") }}</label>
            <p v-if="items.length === 0" class="info">
              {{ $t("generate_docs_first") }}
            </p>
            <div v-else class="row-wrapper">
              <div
                v-tooltip.bottom="{
                  content: !currentUser
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : currentUser.provider !== 'github.com'
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : null,
                }"
              >
                <button
                  :disabled="
                    !currentUser
                      ? true
                      : currentUser.provider !== 'github.com'
                      ? true
                      : false
                  "
                  class="icon"
                  @click="createDocsGist"
                >
                  <i class="material-icons">assignment</i>
                  <span>{{ $t("create_secret_gist") }}</span>
                </button>
              </div>
            </div>
            <div>
              <span
                v-for="(collection, index) in items"
                :key="`collection-${index}`"
              >
                <DocsCollection :collection="collection" />
              </span>
            </div>
          </div>
        </AppSection>
      </div>

      <aside class="sticky-inner inner-right lg:max-w-md">
        <Collections
          :selected="selected"
          :doc="true"
          @use-collection="useSelectedCollection($event)"
          @remove-collection="removeSelectedCollection($event)"
        />
      </aside>
    </div>
  </div>
</template>

<script>
import Mustache from "mustache"
import { currentUser$ } from "~/helpers/fb/auth"
import DocsTemplate from "~/assets/md/docs.md"
import folderContents from "~/assets/md/folderContents.md"
import folderBody from "~/assets/md/folderBody.md"

export default {
  data() {
    return {
      collectionJSON: "[]",
      items: [],
      docsMarkdown: "",
      selected: [],
    }
  },
  subscriptions() {
    return {
      currentUser: currentUser$,
    }
  },
  head() {
    return {
      title: `Documentation • Hoppscotch`,
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
          this.$toast.success(this.$t("gist_created"), {
            icon: "done",
          })
          window.open(res.html_url)
        })
        .catch((error) => {
          this.$toast.error(this.$t("something_went_wrong"), {
            icon: "error",
          })
          console.log(error)
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
        this.$toast.info(this.$t("file_imported"), {
          icon: "attach_file",
        })
      } else {
        this.$toast.error(this.$t("choose_file"), {
          icon: "attach_file",
        })
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
        this.$toast.info(this.$t("docs_generated"), {
          icon: "book",
        })
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
              return this.rawParams && this.rawParams !== "{}"
            },
            isPreRequestScript() {
              return (
                this.preRequestScript &&
                this.preRequestScript !== `// pw.env.set('variable', 'value');`
              )
            },
            isTestScript() {
              return (
                this.testScript &&
                this.testScript !== `// pw.expect('variable').toBe('value');`
              )
            },
          },
          {
            folderContents,
            folderBody,
          }
        )
        this.docsMarkdown = docsMarkdown.replace(/^\s*[\r\n]/gm, "\n\n")
      } catch (e) {
        this.$toast.error(e, {
          icon: "code",
        })
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
}
</script>
