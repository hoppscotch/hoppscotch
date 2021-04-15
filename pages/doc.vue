<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <AppSection :label="$t('import')" ref="import" no-legend>
          <div class="flex flex-col">
            <label>{{ $t("collection") }}</label>
            <p class="info">
              {{ $t("generate_docs_message") }}
            </p>
            <div class="row-wrapper">
              <label for="collectionUpload">
                <button class="icon" @click="$refs.collectionUpload.click()" v-tooltip="'JSON'">
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
                <button class="icon" @click="collectionJSON = '[]'" v-tooltip.bottom="$t('clear')">
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
                fontSize: '16px',
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

        <AppSection :label="$t('documentation')" ref="documentation" no-legend>
          <div class="flex flex-col">
            <label>{{ $t("documentation") }}</label>
            <p v-if="this.items.length === 0" class="info">
              {{ $t("generate_docs_first") }}
            </p>
            <div v-else class="row-wrapper">
              <div
                v-tooltip.bottom="{
                  content: !fb.currentUser
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : fb.currentUser.provider !== 'github.com'
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : null,
                }"
              >
                <button
                  :disabled="
                    !fb.currentUser ? true : fb.currentUser.provider !== 'github.com' ? true : false
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
              <span v-for="(collection, index) in this.items" :key="index">
                <DocsCollection :collection="collection" />
              </span>
            </div>
          </div>
        </AppSection>
      </div>

      <aside class="sticky-inner inner-right lg:max-w-md">
        <Collections @use-collection="useSelectedCollection($event)" :doc="true" />
      </aside>
    </div>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"
import Mustache from "mustache"
import DocsTemplate from "~/assets/md/docs.md"

export default {
  data() {
    return {
      fb,
      collectionJSON: "[]",
      items: [],
      docsMarkdown: "",
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
              Authorization: `token ${fb.currentUser.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )
        .then(({ html_url }) => {
          this.$toast.success(this.$t("gist_created"), {
            icon: "done",
          })
          window.open(html_url)
        })
        .catch((error) => {
          this.$toast.error(this.$t("something_went_wrong"), {
            icon: "error",
          })
          console.log(error)
        })
    },

    uploadCollection() {
      let file = this.$refs.collectionUpload.files[0]
      if (file !== undefined && file !== null) {
        let reader = new FileReader()
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

    getDoc() {
      try {
        this.items = JSON.parse(this.collectionJSON)
        this.$toast.clear()
        this.$toast.info(this.$t("docs_generated"), {
          icon: "book",
        })
        const docsMarkdown = Mustache.render(DocsTemplate, {
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
        })
        this.docsMarkdown = docsMarkdown.replace(/^\s*[\r\n]/gm, "\n")
      } catch (e) {
        this.$toast.error(e, {
          icon: "code",
        })
      }
    },

    useSelectedCollection(collection) {
      let importCollection = `[${JSON.stringify(collection, null, 2)}]`
      this.collectionJSON = JSON.stringify(JSON.parse(importCollection), null, 2)
    },
  },
  head() {
    return {
      title: `Documentation • Hoppscotch`,
    }
  },
}
</script>
