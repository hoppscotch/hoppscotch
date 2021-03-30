<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <AppSection :label="$t('request')" ref="request" no-legend>
          <ul>
            <li class="shrink">
              <label for="method">{{ $t("method") }}</label>
              <span class="select-wrapper">
                <v-popover>
                  <input
                    id="method"
                    class="method"
                    :value="request.method"
                    @change="
                      (newName) => {
                        this.request = { ...this.request, method: newName.target.value }
                      }
                    "
                    :readonly="!customMethod"
                    autofocus
                  />
                  <template slot="popover">
                    <div
                      v-for="(methodMenuItem, index) in methodMenuItems"
                      :key="`method-${index}`"
                    >
                      <button
                        class="icon"
                        @click="
                          customMethod = methodMenuItem == 'CUSTOM' ? true : false
                          request = { ...request, method: methodMenuItem }
                        "
                        v-close-popover
                      >
                        {{ methodMenuItem }}
                      </button>
                    </div>
                  </template>
                </v-popover>
              </span>
            </li>
            <li>
              <label for="url">{{ $t("url") }}</label>
              <input
                v-if="!EXPERIMENTAL_URL_BAR_ENABLED"
                :class="{ error: !isValidURL }"
                class="border-dashed md:border-l border-brdColor"
                @keyup.enter="isValidURL ? sendRequest() : null"
                id="url"
                name="url"
                type="text"
                v-model="uri"
                spellcheck="false"
                @input="pathInputHandler"
                :placeholder="$t('url')"
              />
              <SmartUrlField v-model="uri" v-else />
            </li>
            <li class="shrink">
              <label class="hide-on-small-screen" for="send">&nbsp;</label>
              <button
                v-if="!runningRequest"
                :disabled="!isValidURL"
                @click="sendRequest"
                id="send"
                ref="sendButton"
              >
                {{ $t("send") }}
                <span>
                  <i class="material-icons">send</i>
                </span>
              </button>
              <button v-else @click="cancelRequest" id="send" ref="sendButton">
                {{ $t("cancel") }}
                <span>
                  <i class="material-icons">clear</i>
                </span>
              </button>
            </li>
          </ul>
          <ul>
            <li>
              <label for="name" class="text-sm">{{ $t("token_req_name") }}</label>
              <input
                id="name"
                name="name"
                type="text"
                :value="request.name"
                @change="
                  (newValue) => {
                    this.request = { ...this.request, name: newValue.target.value }
                  }
                "
                class="text-sm"
              />
            </li>
          </ul>
          <div
            label="Request Body"
            v-if="['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)"
          >
            <ul>
              <li>
                <label for="contentType" class="text-sm">{{ $t("content_type") }}</label>
                <SmartAutoComplete
                  :source="validContentTypes"
                  :spellcheck="false"
                  :value="request.contentType"
                  @input="
                    (value) => {
                      this.request = { ...this.request, contentType: value }
                    }
                  "
                  styles="text-sm"
                />
              </li>
            </ul>
            <ul>
              <li>
                <div class="row-wrapper">
                  <span>
                    <SmartToggle
                      v-if="canListParameters"
                      :on="request.rawInput"
                      @change="
                        (value) => {
                          this.request = { ...this.request, rawInput: value }
                        }
                      "
                    >
                      {{ $t("raw_input") }}
                    </SmartToggle>
                  </span>
                </div>
              </li>
            </ul>
            <HttpBodyParameters
              v-if="!request.rawInput"
              :bodyParams="request.bodyParams"
              @clear-content="clearContent"
              @set-route-query-state="setRouteQueryState"
              @remove-request-body-param="removeRequestBodyParam"
              @add-request-body-param="addRequestBodyParam"
            />
            <HttpRawBody v-else :rawParams="request.rawParams" :contentType="request.contentType"
            :rawInput="request.rawInput" @clear-content="clearContent"
            @update-raw-body="updateRawBody" @update-raw-input="updateRawInput = (value) => {
            this.request = { ...this.request, rawInput: value } } "" />
          </div>
          <div class="row-wrapper">
            <span>
              <button
                class="icon"
                @click="showCurlImportModal = !showCurlImportModal"
                v-tooltip.bottom="$t('import_curl')"
              >
                <i class="material-icons">import_export</i>
              </button>
              <button
                class="icon"
                @click="showCodegenModal = !showCodegenModal"
                :disabled="!isValidURL"
                v-tooltip.bottom="$t('show_code')"
              >
                <i class="material-icons">code</i>
              </button>
            </span>
            <span>
              <button
                class="icon"
                @click="copyRequest"
                ref="copyRequest"
                :disabled="!isValidURL"
                v-tooltip.bottom="$t('copy_request_link')"
              >
                <i v-if="navigatorShare" class="material-icons">share</i>
                <i v-else class="material-icons">content_copy</i>
              </button>
              <button
                class="icon"
                @click="saveRequest"
                ref="saveRequest"
                :disabled="!isValidURL"
                v-tooltip.bottom="$t('save_to_collections')"
              >
                <i class="material-icons">create_new_folder</i>
              </button>
              <button
                class="icon"
                @click="clearContent('', $event)"
                v-tooltip.bottom="$t('clear_all')"
                ref="clearAll"
              >
                <i class="material-icons">clear_all</i>
              </button>
            </span>
          </div>
        </AppSection>

        <section id="options">
          <SmartTabs>
            <SmartTab
              :id="'params'"
              :label="
                $t('parameters') +
                `${request.params.length !== 0 ? ' \xA0 • \xA0 ' + request.params.length : ''}`
              "
              :selected="true"
            >
              <HttpParameters
                :params="request.params"
                @clear-content="clearContent"
                @remove-request-param="removeRequestParam"
                @add-request-param="addRequestParam"
              />
            </SmartTab>

            <SmartTab
              :id="'headers'"
              :label="
                $t('headers') +
                `${request.headers.length !== 0 ? ' \xA0 • \xA0 ' + request.headers.length : ''}`
              "
            >
              <HttpHeaders
                :headers="request.headers"
                @clear-content="clearContent"
                @set-route-query-state="setRouteQueryState"
                @remove-request-header="removeRequestHeader"
                @add-request-header="addRequestHeader"
              />
            </SmartTab>

            <SmartTab :id="'authentication'" :label="$t('authentication')">
              <AppSection :label="$t('authentication')" ref="authentication" no-legend>
                <ul>
                  <li>
                    <div class="row-wrapper">
                      <label for="auth">{{ $t("authentication") }}</label>
                      <div>
                        <button
                          class="icon"
                          @click="clearContent('auth', $event)"
                          v-tooltip.bottom="$t('clear')"
                        >
                          <i class="material-icons">clear_all</i>
                        </button>
                      </div>
                    </div>
                    <span class="select-wrapper">
                      <select
                        id="auth"
                        :value="request.auth"
                        @change="
                          (newName) => {
                            this.request = { ...this.request, auth: newName.target.value }
                          }
                        "
                      >
                        <option>None</option>
                        <option>Basic Auth</option>
                        <option>Bearer Token</option>
                        <option>OAuth 2.0</option>
                      </select>
                    </span>
                  </li>
                </ul>
                <ul v-if="request.auth === 'Basic Auth'">
                  <li>
                    <input
                      placeholder="User"
                      name="http_basic_user"
                      :value="request.httpUser"
                      @change="
                        (newName) => {
                          this.request = { ...this.request, httpUser: newName.target.value }
                        }
                      "
                    />
                  </li>
                  <li>
                    <input
                      placeholder="Password"
                      name="http_basic_passwd"
                      :type="passwordFieldType"
                      :value="request.httpPassword"
                      @change="
                        (newName) => {
                          this.request = { ...this.request, httpPassword: newName.target.value }
                        }
                      "
                    />
                  </li>
                  <div>
                    <li>
                      <button class="icon" ref="switchVisibility" @click="switchVisibility">
                        <i class="material-icons" v-if="passwordFieldType === 'text'">visibility</i>
                        <i class="material-icons" v-if="passwordFieldType !== 'text'"
                          >visibility_off</i
                        >
                      </button>
                    </li>
                  </div>
                </ul>
                <ul v-if="request.auth === 'Bearer Token' || request.auth === 'OAuth 2.0'">
                  <li>
                    <div class="row-wrapper">
                      <input
                        placeholder="Token"
                        name="bearer_token"
                        :value="request.bearerToken"
                        @change="
                          (newName) => {
                            this.request = { ...this.request, bearerToken: newName.target.value }
                          }
                        "
                      />
                      <button
                        v-if="request.auth === 'OAuth 2.0'"
                        class="icon"
                        @click="showTokenListModal = !showTokenListModal"
                        v-tooltip.bottom="$t('use_token')"
                      >
                        <i class="material-icons">open_in_new</i>
                      </button>
                      <button
                        v-if="request.auth === 'OAuth 2.0'"
                        class="icon"
                        @click="showTokenRequest = !showTokenRequest"
                        v-tooltip.bottom="$t('get_token')"
                      >
                        <i class="material-icons">vpn_key</i>
                      </button>
                    </div>
                  </li>
                </ul>
                <div class="row-wrapper">
                  <SmartToggle :on="!URL_EXCLUDES.auth" @change="setExclude('auth', !$event)">
                    {{ $t("include_in_url") }}
                  </SmartToggle>
                </div>
              </AppSection>

              <AppSection
                v-if="showTokenRequest"
                class="red"
                label="Access Token Request"
                ref="accessTokenRequest"
              >
                <ul>
                  <li>
                    <div class="row-wrapper">
                      <label for="token-name">{{ $t("token_name") }}</label>
                      <div>
                        <button
                          class="icon"
                          @click="showTokenRequestList = true"
                          v-tooltip.bottom="$t('manage_token_req')"
                        >
                          <i class="material-icons">library_add</i>
                        </button>
                        <button
                          class="icon"
                          @click="clearContent('access_token', $event)"
                          v-tooltip.bottom="$t('clear')"
                        >
                          <i class="material-icons">clear_all</i>
                        </button>
                        <button
                          class="icon"
                          @click="showTokenRequest = false"
                          v-tooltip.bottom="$t('close')"
                        >
                          <i class="material-icons">close</i>
                        </button>
                      </div>
                    </div>
                    <input
                      id="token-name"
                      :placeholder="$t('optional')"
                      name="token_name"
                      :value="oauth2.accessTokenName"
                      @change="
                        ($event) => {
                          this.oauth2 = { ...this.oauth2, accessTokenName: $event.target.value }
                        }
                      "
                      type="text"
                    />
                  </li>
                </ul>
                <ul>
                  <li>
                    <label for="oidc-discovery-url">
                      {{ $t("oidc_discovery_url") }}
                    </label>
                    <input
                      :disabled="this.oauth2.authUrl !== '' || this.oauth2.accessTokenUrl !== ''"
                      id="oidc-discovery-url"
                      name="oidc_discovery_url"
                      type="url"
                      :value="oauth2.oidcDiscoveryUrl"
                      @change="
                        ($event) => {
                          this.oauth2 = { ...this.oauth2, oidcDiscoveryUrl: $event.target.value }
                        }
                      "
                      placeholder="https://example.com/.well-known/openid-configuration"
                    />
                  </li>
                </ul>
                <ul>
                  <li>
                    <label for="auth-url">{{ $t("auth_url") }}</label>
                    <input
                      :disabled="this.oauth2.oidcDiscoveryUrl !== ''"
                      id="auth-url"
                      name="auth_url"
                      type="url"
                      :value="oauth2.authUrl"
                      @click="
                        ($event) => {
                          this.oauth2 = { ...this.oauth2, authUrl: $event.target.value }
                        }
                      "
                      placeholder="https://example.com/login/oauth/authorize"
                    />
                  </li>
                </ul>
                <ul>
                  <li>
                    <label for="access-token-url">
                      {{ $t("access_token_url") }}
                    </label>
                    <input
                      :disabled="this.oauth2.oidcDiscoveryUrl !== ''"
                      id="access-token-url"
                      name="access_token_url"
                      type="url"
                      :value="oauth2.accessTokenUrl"
                      placeholder="https://example.com/login/oauth/access_token"
                    />
                  </li>
                </ul>
                <ul>
                  <li>
                    <label for="client-id">{{ $t("client_id") }}</label>
                    <input
                      id="client-id"
                      name="client_id"
                      type="text"
                      :value="oauth2.clientId"
                      @change="
                        ($event) => {
                          this.oauth2 = { ...this.oauth2, clientId: $event.target.value }
                        }
                      "
                      placeholder="Client ID"
                    />
                  </li>
                </ul>
                <ul>
                  <li>
                    <label for="scope">{{ $t("scope") }}</label>
                    <input
                      id="scope"
                      name="scope"
                      type="text"
                      :value="oauth2.scope"
                      @click="
                        ($event) => {
                          this.oauth2 = { ...this.oauth2, scope: $event.target.value }
                        }
                      "
                      placeholder="e.g. read:org"
                    />
                  </li>
                </ul>
                <ul>
                  <li>
                    <button class="icon" @click="handleAccessTokenRequest">
                      <i class="material-icons">vpn_key</i>
                      <span>{{ $t("request_token") }}</span>
                    </button>
                  </li>
                </ul>
              </AppSection>
            </SmartTab>

            <SmartTab :id="'pre_request_script'" :label="$t('pre_request_script')">
              <AppSection
                v-if="showPreRequestScript"
                class="orange"
                :label="$t('pre_request_script')"
                ref="preRequest"
                no-legend
              >
                <ul>
                  <li>
                    <div class="row-wrapper">
                      <label>{{ $t("javascript_code") }}</label>
                      <div>
                        <a
                          href="https://github.com/hoppscotch/hoppscotch/wiki/Pre-Request-Scripts"
                          target="_blank"
                          rel="noopener"
                        >
                          <button class="icon" v-tooltip="$t('wiki')">
                            <i class="material-icons">help_outline</i>
                          </button>
                        </a>
                      </div>
                    </div>
                    <SmartJsEditor
                      v-model="preRequestScript"
                      :options="{
                        maxLines: '16',
                        minLines: '8',
                        fontSize: '16px',
                        autoScrollEditorIntoView: true,
                        showPrintMargin: false,
                        useWorker: false,
                      }"
                      styles="rounded-b-lg"
                      completeMode="pre"
                    />
                  </li>
                </ul>
              </AppSection>
            </SmartTab>

            <SmartTab :id="'tests'" :label="$t('tests')">
              <AppSection
                v-if="testsEnabled"
                class="orange"
                :label="$t('tests')"
                ref="postRequestTests"
                no-legend
              >
                <ul>
                  <li>
                    <div class="row-wrapper">
                      <label>{{ $t("javascript_code") }}</label>
                      <div>
                        <a
                          href="https://github.com/hoppscotch/hoppscotch/wiki/Post-Request-Tests"
                          target="_blank"
                          rel="noopener"
                        >
                          <button class="icon" v-tooltip="$t('wiki')">
                            <i class="material-icons">help_outline</i>
                          </button>
                        </a>
                      </div>
                    </div>
                    <SmartJsEditor
                      v-model="testScript"
                      :options="{
                        maxLines: '16',
                        minLines: '8',
                        fontSize: '16px',
                        autoScrollEditorIntoView: true,
                        showPrintMargin: false,
                        useWorker: false,
                      }"
                      styles="rounded-b-lg"
                      completeMode="test"
                    />
                    <div v-if="testReports.length !== 0">
                      <div class="row-wrapper">
                        <label>Test Reports</label>
                        <div>
                          <button
                            class="icon"
                            @click="clearContent('tests', $event)"
                            v-tooltip.bottom="$t('clear')"
                          >
                            <i class="material-icons">clear_all</i>
                          </button>
                        </div>
                      </div>
                      <div v-for="(testReport, index) in testReports" :key="index">
                        <div v-if="testReport.startBlock" class="info">
                          <hr />
                          <h4>{{ testReport.startBlock }}</h4>
                        </div>
                        <p v-else-if="testReport.result" class="row-wrapper info">
                          <span :class="testReport.styles.class">
                            <i class="material-icons">
                              {{ testReport.styles.icon }}
                            </i>
                            <span>&nbsp; {{ testReport.result }}</span>
                            <span v-if="testReport.message">
                              <label>&nbsp; • &nbsp; {{ testReport.message }}</label>
                            </span>
                          </span>
                        </p>
                        <div v-else-if="testReport.endBlock"><hr /></div>
                      </div>
                    </div>
                  </li>
                </ul>
              </AppSection>
            </SmartTab>
          </SmartTabs>
        </section>

        <HttpResponse :response="response" :active="runningRequest" ref="response" />
      </div>

      <aside v-if="activeSidebar" class="sticky-inner inner-right lg:max-w-md">
        <section>
          <SmartTabs>
            <SmartTab :id="'history'" :label="$t('history')" :selected="true">
              <History :page="'rest'" @useHistory="handleUseHistory" ref="historyComponent" />
            </SmartTab>

            <SmartTab :id="'collections'" :label="$t('collections')">
              <Collections />
            </SmartTab>

            <SmartTab :id="'env'" :label="$t('environments')">
              <Environments @use-environment="useSelectedEnvironment($event)" />
            </SmartTab>

            <SmartTab :id="'notes'" :label="$t('notes')">
              <HttpNotes />
            </SmartTab>
          </SmartTabs>
        </section>
      </aside>
    </div>

    <CollectionsSaveRequest
      :show="showSaveRequestModal"
      @hide-modal="hideRequestModal"
      :editing-request="editRequest"
    />

    <HttpImportCurl
      :show="showCurlImportModal"
      @hide-modal="showCurlImportModal = false"
      @handle-import="handleImport"
    />

    <HttpCodegenModal
      :show="showCodegenModal"
      :requestTypeProp="request.requestType"
      :requestCode="requestCode"
      @hide-modal="showCodegenModal = false"
      @set-request-type="setRequestType"
    />

    <HttpTokenList
      :show="showTokenListModal"
      :tokens="oauth2.tokens"
      @clear-content="clearContent"
      @use-oauth-token="useOAuthToken"
      @remove-oauth-token="removeOAuthToken"
      @hide-modal="showTokenListModal = false"
    />

    <SmartModal v-if="showTokenRequestList" @close="showTokenRequestList = false">
      <div slot="header">
        <div class="row-wrapper">
          <h3 class="title">{{ $t("manage_token_req") }}</h3>
          <div>
            <button class="icon" @click="showTokenRequestList = false">
              <i class="material-icons">close</i>
            </button>
          </div>
        </div>
      </div>
      <div slot="body" class="flex flex-col">
        <div class="row-wrapper">
          <label for="token-req-list">{{ $t("token_req_list") }}</label>
          <div>
            <button
              :disabled="oauth2.tokenReqs.length === 0"
              class="icon"
              @click="showTokenRequestList = false"
              v-tooltip.bottom="$t('use_token_req')"
            >
              <i class="material-icons">input</i>
            </button>
            <button
              :disabled="oauth2.tokenReqs.length === 0"
              class="icon"
              @click="removeOAuthTokenReq"
              v-tooltip.bottom="$t('delete')"
            >
              <i class="material-icons">delete</i>
            </button>
          </div>
        </div>
        <ul>
          <li>
            <span class="select-wrapper">
              <select
                id="token-req-list"
                :value="oauth2.tokenReqSelect"
                @change="
                  ($event) => {
                    this.oauth2 = { ...oauth2, tokenReqSelect: $event.target.value }
                    tokenReqChange($event)
                  }
                "
                :disabled="oauth2.tokenReqs.length === 0"
              >
                <option v-for="(req, index) in oauth2.tokenReqs" :key="index" :value="req.name">
                  {{ req.name }}
                </option>
              </select>
            </span>
          </li>
        </ul>
        <label for="token-req-name">{{ $t("token_req_name") }}</label>
        <input
          :value="oauth2.tokenReqName"
          @change="
            ($event) => {
              this.oauth2 = { ...this.oauth2, tokenReqName: $event.target.value }
            }
          "
        />
        <label for="token-req-details">
          {{ $t("token_req_details") }}
        </label>
        <textarea id="token-req-details" readonly rows="7" v-model="tokenReqDetails"></textarea>
      </div>
      <div slot="footer">
        <div class="row-wrapper">
          <span></span>
          <span>
            <button class="icon primary" @click="addOAuthTokenReq">
              {{ $t("save_token_req") }}
            </button>
          </span>
        </div>
      </div>
    </SmartModal>
  </div>
</template>

<script>
import url from "url"
import querystring from "querystring"
import parseCurlCommand from "~/helpers/curlparser"
import getEnvironmentVariablesFromScript from "~/helpers/preRequest"
import runTestScriptWithVariables from "~/helpers/postwomanTesting"
import parseTemplateString from "~/helpers/templating"
import { tokenRequest, oauthRedirect } from "~/helpers/oauth"
import { cancelRunningRequest, sendNetworkRequest } from "~/helpers/network"
import { fb } from "~/helpers/fb"
import { hasPathParams, addPathParamsToVariables, getQueryParams } from "~/helpers/requestParams"
import { parseUrlAndPath } from "~/helpers/utils/uri"
import { httpValid } from "~/helpers/utils/valid"
import { knownContentTypes, isJSONContentType } from "~/helpers/utils/contenttypes"
import { generateCodeWithGenerator } from "~/helpers/codegen/codegen"
import { getSettingSubject, applySetting } from "~/newstore/settings"
import clone from "lodash/clone"

export default {
  data() {
    return {
      showCurlImportModal: false,
      showPreRequestScript: true,
      testsEnabled: true,
      testScript: "// pw.expect('variable').toBe('value');",
      preRequestScript: "// pw.env.set('variable', 'value');",
      testReports: [],
      copyButton: '<i class="material-icons">content_copy</i>',
      downloadButton: '<i class="material-icons">save_alt</i>',
      doneButton: '<i class="material-icons">done</i>',
      showCodegenModal: false,
      response: {
        status: "",
        headers: "",
        body: "",
        duration: 0,
        size: 0,
      },
      validContentTypes: knownContentTypes,
      paramsWatchEnabled: true,
      showTokenListModal: false,
      showTokenRequest: false,
      showTokenRequestList: false,
      showSaveRequestModal: false,
      editRequest: {},
      activeSidebar: true,
      fb,
      customMethod: false,
      files: [],
      filenames: "",
      navigatorShare: navigator.share,
      runningRequest: false,
      currentMethodIndex: 0,
      methodMenuItems: [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "DELETE",
        "CONNECT",
        "OPTIONS",
        "TRACE",
        "PATCH",
        "CUSTOM",
      ],
    }
  },
  subscriptions() {
    return {
      SCROLL_INTO_ENABLED: getSettingSubject("SCROLL_INTO_ENABLED"),
      PROXY_ENABLED: getSettingSubject("PROXY_ENABLED"),
      URL_EXCLUDES: getSettingSubject("URL_EXCLUDES"),
      EXPERIMENTAL_URL_BAR_ENABLED: getSettingSubject("EXPERIMENTAL_URL_BAR_ENABLED"),

      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
      SYNC_HISTORY: getSettingSubject("syncHistory"),
    }
  },
  watch: {
    canListParameters: {
      immediate: true,
      handler(canListParameters) {
        if (canListParameters) {
          this.$nextTick(() => {
            this.request = {
              ...this.request,
              rawInput: Boolean(this.request.rawParams && this.request.rawParams !== "{}"),
            }
          })
        } else {
          this.request = { ...this.request, rawInput: true }
        }
      },
    },
    request(request, oldRequest) {
      if (request.contentType == oldRequest.contentType) return
      const getDefaultParams = (contentType) => {
        if (isJSONContentType(request.contentType)) return "{}"
        switch (request.contentType) {
          case "application/xml":
            return "<?xml version='1.0' encoding='utf-8'?>"
          case "text/html":
            return "<!doctype html>"
        }
        return ""
      }
      if (
        !this.request.rawParams ||
        this.request.rawParams === getDefaultParams(oldRequest.contentType)
      ) {
        this.request.rawParams = getDefaultParams(request.contentType)
      }
      this.setRouteQueryState()
    },
    params: {
      handler(newValue) {
        if (!this.paramsWatchEnabled) {
          this.paramsWatchEnabled = true
          return
        }
        let path = this.path
        let queryString = getQueryParams(newValue)
          .map(({ key, value }) => `${key.trim()}=${value.trim()}`)
          .join("&")
        queryString = queryString === "" ? "" : `?${encodeURI(queryString)}`
        if (path.includes("?")) {
          path = path.slice(0, path.indexOf("?")) + queryString
        } else {
          path = path + queryString
        }
        this.path = path
        this.setRouteQueryState()
      },
      deep: true,
    },
    selectedRequest(newValue, oldValue) {
      // @TODO: Convert all variables to single request variable
      if (!newValue) return
      this.request = newValue
      this.uri = newValue.url + newValue.path
      this.url = newValue.url
      this.path = newValue.path
      this.passwordFieldType = newValue.passwordFieldType
      this.bearerToken = newValue.bearerToken
      if (newValue.preRequestScript) {
        this.showPreRequestScript = true
        this.preRequestScript = newValue.preRequestScript
      }
      if (newValue.testScript) {
        this.testsEnabled = true
        this.testScript = newValue.testScript
      }
    },
    editingRequest(newValue) {
      this.editRequest = newValue
      this.showSaveRequestModal = true
    },
    method() {
      this.request = {
        ...this.request,
        contentType: ["POST", "PUT", "PATCH", "DELETE"].includes(this.request.method)
          ? "application/json"
          : "",
      }
    },
    preRequestScript(val, oldVal) {
      this.uri = this.uri
    },
  },
  computed: {
    /**
     * Check content types that can be automatically
     * serialized by postwoman.
     */
    canListParameters() {
      return (
        this.request.contentType === "application/x-www-form-urlencoded" ||
        this.request.contentType === "multipart/form-data" ||
        isJSONContentType(this.request.contentType)
      )
    },
    uri: {
      get() {
        return this.$store.state.request.uri ? this.$store.state.request.uri : this.url + this.path
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "uri" })
        let url = value
        if (
          (this.preRequestScript && this.showPreRequestScript) ||
          hasPathParams(this.request.params)
        ) {
          let environmentVariables = getEnvironmentVariablesFromScript(this.preRequestScript)
          environmentVariables = addPathParamsToVariables(this.request.params, environmentVariables)
          url = parseTemplateString(value, environmentVariables)
        }
        let result = parseUrlAndPath(url)
        this.url = result.url
        this.path = result.path
      },
    },
    url: {
      get() {
        return this.$store.state.request.url
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "url" })
      },
    },
    path: {
      get() {
        return this.$store.state.request.path
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "path" })
      },
    },
    request: {
      get() {
        return this.$store.state.request
      },
      set(value) {
        this.$store.commit("updateRequest", value)
      },
    },
    oauth2: {
      get() {
        return this.$store.state.oauth2
      },
      set(value) {
        console.log(value)
        this.$store.commit("updateOAuth2", value)
      },
    },
    passwordFieldType: {
      get() {
        return this.$store.state.request.passwordFieldType
      },
      set(value) {
        this.$store.commit("setState", {
          value,
          attribute: "passwordFieldType",
        })
      },
    },
    selectedRequest() {
      return this.$store.state.postwoman.selectedRequest
    },
    editingRequest() {
      return this.$store.state.postwoman.editingRequest
    },
    isValidURL() {
      // if showPreRequestScript, we cannot determine if a URL is valid because the full string is not known ahead of time
      return this.showPreRequestScript || httpValid(this.url)
    },
    hasRequestBody() {
      return ["POST", "PUT", "PATCH", "DELETE"].includes(this.request.method)
    },
    pathName() {
      return this.path.match(/^([^?]*)\??/)[1]
    },
    rawRequestBody() {
      if (isJSONContentType(this.request.contentType)) {
        try {
          const obj = JSON.parse(
            `{${this.request.bodyParams
              .filter((item) => (item.hasOwnProperty("active") ? item.active == true : true))
              .filter(({ key }) => !!key)
              .map(({ key, value }) => `"${key}": "${value}"`)
              .join()}}`
          )
          return JSON.stringify(obj, null, 2)
        } catch (ex) {
          console.log(ex)
          this.$toast.clear()
          this.$toast.error(
            "Parameter value must be a string, switch to Raw input for other formats",
            {
              icon: "error",
            }
          )
          return "invalid"
        }
      } else {
        return this.request.bodyParams
          .filter((item) => (item.hasOwnProperty("active") ? item.active == true : true))
          .filter(({ key }) => !!key)
          .map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join("&")
      }
    },
    queryString() {
      const result = getQueryParams(this.request.params)
        .map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&")
      return result === "" ? "" : `?${result}`
    },
    requestCode() {
      let headers = []
      if (this.preRequestScript || hasPathParams(this.request.params)) {
        let environmentVariables = getEnvironmentVariablesFromScript(this.preRequestScript)
        environmentVariables = addPathParamsToVariables(this.request.params, environmentVariables)
        for (let k of this.request.headers.filter((item) =>
          item.hasOwnProperty("active") ? item.active == true : true
        )) {
          const kParsed = parseTemplateString(k.key, environmentVariables)
          const valParsed = parseTemplateString(k.value, environmentVariables)
          headers.push({ key: kParsed, value: valParsed })
        }
      }

      return generateCodeWithGenerator(this.request.requestType, {
        ...this.request,
        url: this.url,
        pathName: this.pathName,
        queryString: this.queryString,
        rawParams: this.request.rawParams,
        rawRequestBody: this.rawRequestBody,
      })
    },
    tokenReqDetails() {
      const details = {
        oidcDiscoveryUrl: this.oauth2.oidcDiscoveryUrl,
        authUrl: this.oauth2.authUrl,
        accessTokenUrl: this.oauth2.accessTokenUrl,
        clientId: this.oauth2.clientId,
        scope: this.oauth2.scope,
      }
      return JSON.stringify(details, null, 2)
    },
  },
  methods: {
    useSelectedEnvironment(args) {
      let environment = args.environment
      let environments = args.environments
      let preRequestScriptString = ""
      for (let variable of environment.variables) {
        preRequestScriptString += `pw.env.set('${variable.key}', '${variable.value}');\n`
      }
      for (let env of environments) {
        if (env.name === environment.name) {
          continue
        }

        if (env.name === "Globals" || env.name === "globals") {
          preRequestScriptString += this.useSelectedEnvironment({
            environment: env,
            environments,
          })
        }
      }
      this.preRequestScript = preRequestScriptString
      this.showPreRequestScript = true
      return preRequestScriptString
    },
    checkCollections() {
      const checkCollectionAvailability =
        this.$store.state.postwoman.collections &&
        this.$store.state.postwoman.collections.length > 0
      return checkCollectionAvailability
    },
    scrollInto(view) {
      this.$refs[view].$el.scrollIntoView({
        behavior: "smooth",
      })
    },
    handleUseHistory(entry) {
      this.request = entry
      console.log(this.request)
      this.uri = entry.url + entry.path
      this.url = entry.url
      this.path = entry.path
      this.showPreRequestScript = entry.usesPreScripts
      this.preRequestScript = entry.preRequestScript
      this.testScript = entry.testScript
      this.testsEnabled = entry.usesPostScripts
      if (this.SCROLL_INTO_ENABLED) this.scrollInto("request")
    },
    async makeRequest(auth, headers, requestBody, preRequestScript) {
      const requestOptions = {
        method: this.request.method,
        url: this.url + this.pathName + this.queryString,
        auth,
        headers,
        data: requestBody,
        credentials: true,
      }

      if (preRequestScript || hasPathParams(this.request.params)) {
        let environmentVariables = getEnvironmentVariablesFromScript(preRequestScript)
        environmentVariables = addPathParamsToVariables(this.request.params, environmentVariables)
        requestOptions.url = parseTemplateString(requestOptions.url, environmentVariables)
        if (!(requestOptions.data instanceof FormData)) {
          // TODO: Parse env variables for form data too
          requestOptions.data = parseTemplateString(requestOptions.data, environmentVariables)
        }
        for (let k in requestOptions.headers) {
          const kParsed = parseTemplateString(k, environmentVariables)
          const valParsed = parseTemplateString(requestOptions.headers[k], environmentVariables)
          delete requestOptions.headers[k]
          requestOptions.headers[kParsed] = valParsed
        }
      }
      if (typeof requestOptions.data === "string") {
        requestOptions.data = parseTemplateString(requestOptions.data)
      }
      return await sendNetworkRequest(requestOptions)
    },
    cancelRequest() {
      cancelRunningRequest()
    },
    async sendRequest() {
      this.$toast.clear()
      if (this.SCROLL_INTO_ENABLED) this.scrollInto("response")
      if (!this.isValidURL) {
        this.$toast.error(this.$t("url_invalid_format"), {
          icon: "error",
        })
        return
      }
      // Start showing the loading bar as soon as possible.
      // The nuxt axios module will hide it when the request is made.
      this.$nuxt.$loading.start()
      this.response = {
        duration: 0,
        size: 0,
        status: this.$t("fetching"),
        body: this.$t("loading"),
      }
      const auth =
        this.request.auth === "Basic Auth"
          ? {
              username: this.request.httpUser,
              password: this.request.httpPassword,
            }
          : null
      let headers = {}
      let headersObject = {}
      Object.keys(headers).forEach((id) => {
        if (headers[id].key) headersObject[headers[id].key] = headers[id].value
      })
      headers = headersObject
      // If the request has a body, we want to ensure Content-Type is sent.
      let requestBody
      if (this.hasRequestBody) {
        requestBody = this.request.rawInput ? this.request.rawParams : this.rawRequestBody
        Object.assign(headers, {
          "Content-Type": `${this.request.contentType}; charset=utf-8`,
        })
      }
      requestBody = requestBody ? requestBody.toString() : null
      if (this.request.contentType === "multipart/form-data") {
        const formData = new FormData()
        for (const bodyParam of this.request.bodyParams.filter((item) =>
          item.hasOwnProperty("active") ? item.active == true : true
        )) {
          if (bodyParam?.value?.[0] instanceof File) {
            for (const file of bodyParam.value) {
              formData.append(bodyParam.key, file)
            }
          } else {
            formData.append(bodyParam.key, bodyParam.value)
          }
        }
        requestBody = formData
      }
      // If the request uses a token for auth, we want to make sure it's sent here.
      if (this.request.auth === "Bearer Token" || this.request.auth === "OAuth 2.0")
        headers["Authorization"] = `Bearer ${this.request.bearerToken}`
      headers = Object.assign(
        // Clone the app headers object first, we don't want to
        // mutate it with the request headers added by default.
        Object.assign(
          {},
          this.request.headers.filter((item) =>
            item.hasOwnProperty("active") ? item.active == true : true
          )
        )
        // We make our temporary headers object the source so
        // that you can override the added headers if you
        // specify them.
        // headers
      )
      Object.keys(headers).forEach((id) => {
        if (headers[id].key) headersObject[headers[id].key] = headers[id].value
      })
      headers = headersObject
      const startTime = new Date().getTime()
      try {
        this.runningRequest = true
        const payload = await this.makeRequest(
          auth,
          headers,
          requestBody,
          this.showPreRequestScript && this.preRequestScript
        )
        this.runningRequest = false
        const duration = new Date().getTime() - startTime
        this.response.duration = duration
        this.response.size = payload.headers["content-length"]
        ;(() => {
          this.response.status = payload.status
          this.response.headers = payload.headers
          // We don't need to bother parsing JSON, axios already handles it for us!
          this.response.body = payload.data
          // Addition of an entry to the history component.
          const entry = {
            ...this.request,
            status: this.response.status,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            updatedOn: new Date(),
            url: this.url,
            path: this.path,
            usesPreScripts: this.showPreRequestScript,
            preRequestScript: this.preRequestScript,
            duration,
            star: false,
            testScript: this.testScript,
            usesPostScripts: this.testsEnabled,
          }

          if (
            (this.preRequestScript && this.showPreRequestScript) ||
            hasPathParams(this.request.params)
          ) {
            let environmentVariables = getEnvironmentVariablesFromScript(this.preRequestScript)
            environmentVariables = addPathParamsToVariables(
              this.request.params,
              environmentVariables
            )
            entry.path = parseTemplateString(entry.path, environmentVariables)
            entry.url = parseTemplateString(entry.url, environmentVariables)
          }

          this.$refs.historyComponent.addEntry(entry)
          if (fb.currentUser !== null && this.SYNC_COLLECTIONS) {
            fb.writeHistory(entry)
          }
        })()
      } catch (error) {
        this.runningRequest = false
        // If the error is caused by cancellation, do nothing
        if (error === "cancellation") {
          this.response.status = this.$t("cancelled")
          this.response.body = this.$t("cancelled")
        } else {
          console.log(error)
          const duration = new Date().getTime() - startTime
          this.response.duration = duration
          this.response.size = Buffer.byteLength(JSON.stringify(error))
          if (error.response) {
            this.response.headers = error.response.headers
            this.response.status = error.response.status
            this.response.body = error.response.data
            // Addition of an entry to the history component.
            const entry = {
              ...this.request,
              status: this.response.status,
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              updatedOn: new Date(),
              url: this.url,
              path: this.path,
              usesPreScripts: this.showPreRequestScript,
              preRequestScript: this.preRequestScript,
              star: false,
              testScript: this.testScript,
              usesPostScripts: this.testsEnabled,
            }

            if (
              (this.preRequestScript && this.showPreRequestScript) ||
              hasPathParams(this.request.params)
            ) {
              let environmentVariables = getEnvironmentVariablesFromScript(this.preRequestScript)
              environmentVariables = addPathParamsToVariables(
                this.request.params,
                environmentVariables
              )
              entry.path = parseTemplateString(entry.path, environmentVariables)
              entry.url = parseTemplateString(entry.url, environmentVariables)
            }

            this.$refs.historyComponent.addEntry(entry)
            if (fb.currentUser !== null && this.SYNC_HISTORY) {
              fb.writeHistory(entry)
            }
            return
          } else {
            this.response.status = error.message
            this.response.body = `${error}. ${this.$t("check_console_details")}`
            this.$toast.error(`${error} ${this.$t("f12_details")}`, {
              icon: "error",
            })
            if (!this.PROXY_ENABLED) {
              this.$toast.info(this.$t("enable_proxy"), {
                icon: "help",
                duration: 8000,
                action: {
                  text: this.$t("yes"),
                  onClick: (e, toastObject) => {
                    this.$router.push({ path: "/settings" })
                  },
                },
              })
            }
          }
        }
      }
      // tests
      const syntheticResponse = {
        status: this.response.status,
        body: this.response.body,
        headers: this.response.headers,
      }

      // Parse JSON body
      if (
        syntheticResponse.headers["content-type"] &&
        isJSONContentType(syntheticResponse.headers["content-type"])
      ) {
        try {
          syntheticResponse.body = JSON.parse(
            new TextDecoder("utf-8").decode(new Uint8Array(syntheticResponse.body))
          )
        } catch (_e) {}
      }

      const { testResults } = runTestScriptWithVariables(this.testScript, {
        response: syntheticResponse,
      })
      this.testReports = testResults
    },
    getQueryStringFromPath() {
      const pathParsed = url.parse(this.uri)
      return pathParsed.query ? pathParsed.query : ""
    },
    queryStringToArray(queryString) {
      const queryParsed = querystring.parse(queryString)
      return Object.keys(queryParsed).map((key) => ({
        key,
        value: queryParsed[key],
        active: true,
      }))
    },
    pathInputHandler() {
      if (this.uri.includes("?")) {
        const queryString = this.getQueryStringFromPath()
        const params = this.queryStringToArray(queryString)
        this.paramsWatchEnabled = false
        this.request = { ...this.request, params: params }
      }
    },
    addRequestHeader() {
      this.$store.commit("addHeaders", {
        key: "",
        value: "",
        active: true,
      })
      return false
    },
    removeRequestHeader(index) {
      // .slice() gives us an entirely new array rather than giving us just the reference
      const oldHeaders = this.request.headers.slice()
      this.$store.commit("removeHeaders", index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.request = { ...this.request, headers: oldHeaders }
            toastObject.remove()
          },
        },
      })
    },
    addRequestParam() {
      this.$store.commit("addParams", { key: "", value: "", type: "query", active: true })
      return false
    },
    removeRequestParam(index) {
      // .slice() gives us an entirely new array rather than giving us just the reference
      const oldParams = this.request.params.slice()
      this.$store.commit("removeParams", index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.request = { ...this.request, params: oldParams }
            toastObject.remove()
          },
        },
      })
    },
    addRequestBodyParam() {
      this.$store.commit("addBodyParams", { key: "", value: "", active: true })
      return false
    },
    removeRequestBodyParam(index) {
      // .slice() gives us an entirely new array rather than giving us just the reference
      const oldBodyParams = this.bodyParams.slice()
      this.$store.commit("removeBodyParams", index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.request = { ...this.request, bodyParams: oldBodyParams }
            toastObject.remove()
          },
        },
      })
    },
    copyRequest() {
      if (navigator.share) {
        const time = new Date().toLocaleTimeString()
        const date = new Date().toLocaleDateString()
        navigator
          .share({
            title: "Hoppscotch",
            text: `Hoppscotch • Open source API development ecosystem at ${time} on ${date}`,
            url: window.location.href,
          })
          .then(() => {})
          .catch(() => {})
      } else {
        const dummy = document.createElement("input")
        document.body.appendChild(dummy)
        dummy.value = window.location.href
        dummy.select()
        document.execCommand("copy")
        document.body.removeChild(dummy)
        this.$refs.copyRequest.innerHTML = this.doneButton
        this.$toast.info(this.$t("copied_to_clipboard"), {
          icon: "done",
        })
        setTimeout(() => (this.$refs.copyRequest.innerHTML = this.copyButton), 1000)
      }
    },
    setRouteQueryState() {
      const flat = (key) => (this[key] !== "" ? `${key}=${this[key]}&` : "")
      let flats = ["url", "path"].filter((item) => item !== null).map((item) => flat(item))
      const request = "request=" + JSON.stringify(this.request)
      history.replaceState(
        window.location.href,
        "",
        `${this.$router.options.base}?${encodeURI(flats.concat(request).join("").slice(0, -1))}`
      )
    },
    setRouteQueries(queries) {
      if (typeof queries !== "object") throw new Error("Route query parameters must be a Object")
      for (const key in queries) {
        if (["request"].includes(key)) this[key] = JSON.parse(decodeURI(encodeURI(queries[key])))
        else if (typeof this[key] === "string") {
          this[key] = queries[key]
        }
      }
    },
    // observeRequestButton() {
    //   const requestElement = this.$refs.request
    //   const sendButtonElement = this.$refs.sendButton
    //   const observer = new IntersectionObserver(
    //     (entries, observer) => {
    //       entries.forEach(({ isIntersecting }) => {
    //         if (isIntersecting) sendButtonElement.classList.remove("show")
    //         // The button should float when it is no longer visible on screen.
    //         // This is done by adding the show class to the button.
    //         else sendButtonElement.classList.add("show")
    //       })
    //     },
    //     {
    //       rootMargin: "0px",
    //       threshold: [0],
    //     }
    //   )
    //   observer.observe(requestElement)
    // },
    handleImport() {
      const { value: text } = document.getElementById("import-curl")
      try {
        const parsedCurl = parseCurlCommand(text)
        const { origin, pathname } = new URL(parsedCurl.url.replace(/"/g, "").replace(/'/g, ""))
        this.url = origin
        this.path = pathname
        this.uri = this.url + this.path
        this.request = { ...this.request, headers: [], method: parsedCurl.method.toUpperCase() }
        if (parsedCurl.headers) {
          for (const key of Object.keys(parsedCurl.headers)) {
            this.$store.commit("addHeaders", {
              key,
              value: parsedCurl.headers[key],
            })
          }
        }
        if (parsedCurl["data"]) {
          this.request = { ...this.request, rawInput: true, rawParams: parsedCurl["data"] }
        }
        this.showCurlImportModal = false
      } catch (error) {
        this.showCurlImportModal = false
        this.$toast.error(this.$t("curl_invalid_format"), {
          icon: "error",
        })
      }
    },
    switchVisibility() {
      this.passwordFieldType = this.passwordFieldType === "password" ? "text" : "password"
    },
    clearContent(name, { target }) {
      switch (name) {
        case "bodyParams":
          this.request = { ...this.request, bodyParams: [] }
          this.files = []
          break
        case "rawParams":
          this.request = { ...this.request, rawParams: "{}" }
          break
        case "parameters":
          this.request = { ...this.request, params: [] }
          break
        case "auth":
          this.request = {
            ...this.request,
            auth: "None",
            httpUser: "",
            httpPassword: "",
            bearerToken: "",
          }
          this.oauth2 = { ...this.oauth2, tokens: [], tokenReqs: [] }
          this.showTokenRequest = false
          break
        case "access_token":
          this.oauth2 = {
            ...this.oauth2,
            accessTokenName: "",
            oidcDiscoveryUrl: "",
            authUrl: "",
            accessTokenUrl: "",
            clientId: "",
            scope: "",
          }
          break
        case "headers":
          this.request = { ...this.request, headers: [] }
          break
        case "tests":
          this.testReports = []
          break
        case "tokens":
          this.oauth2 = { ...this.oauth2, tokens: [] }
          break
        default:
          this.request = {
            ...this.request,
            method: "GET",
            name: "Untitled request",
            auth: "None",
            httpUser: "",
            httpPassword: "",
            bearerToken: "",
            headers: [],
          }
          this.oauth2 = {
            ...this.oauth2,
            tokens: [],
            tokenReqs: [],
            accessTokenName: "",
            oidcDiscoveryUrl: "",
            authUrl: "",
            accessTokenUrl: "",
            clientId: "",
            scope: "",
            bodyParams: [],
            rawParams: "{}",
            params: [],
          }
          this.url = "https://httpbin.org"
          this.path = "/get"
          this.uri = this.url + this.path
          this.files = []
          this.showTokenRequest = false
          this.testReports = []
      }
      target.innerHTML = this.doneButton
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(() => (target.innerHTML = '<i class="material-icons">clear_all</i>'), 1000)
    },
    saveRequest() {
      if (!this.checkCollections()) {
        this.$toast.error(this.$t("create_collection"), {
          icon: "error",
        })
        return
      }
      let urlAndPath = parseUrlAndPath(this.uri)
      this.editRequest = {
        url: decodeURI(urlAndPath.url),
        path: decodeURI(urlAndPath.path),
        ...this.request,
        passwordFieldType: this.passwordFieldType,
        preRequestScript: this.showPreRequestScript == true ? this.preRequestScript : null,
        testScript: this.testsEnabled == true ? this.testScript : null,
      }
      if (this.selectedRequest.url) {
        this.editRequest = Object.assign({}, this.selectedRequest, this.editRequest)
      }
      this.showSaveRequestModal = true
    },
    hideRequestModal() {
      this.showSaveRequestModal = false
      this.editRequest = {}
    },
    setExclude(excludedField, excluded) {
      const update = clone(this.URL_EXCLUDES)

      if (excludedField === "auth") {
        update.auth = excluded
        update.httpUser = excluded
        update.httpPassword = excluded
        update.bearerToken = excluded
      } else {
        update[excludedField] = excluded
      }

      applySetting("URL_EXCLUDES", update)

      this.setRouteQueryState()
    },
    updateRawBody(rawParams) {
      this.request = { ...this.request, rawParams: rawParams }
    },
    async handleAccessTokenRequest() {
      if (
        this.oauth2.oidcDiscoveryUrl === "" &&
        (this.oauth2.authUrl === "" || this.oauth2.accessTokenUrl === "")
      ) {
        this.$toast.error(this.$t("complete_config_urls"), {
          icon: "error",
        })
        return
      }
      try {
        const tokenReqParams = {
          grantType: "code",
          oidcDiscoveryUrl: this.oauth2.oidcDiscoveryUrl,
          authUrl: this.oauth2.authUrl,
          accessTokenUrl: this.oauth2.accessTokenUrl,
          clientId: this.oauth2.clientId,
          scope: this.oauth2.scope,
        }
        await tokenRequest(tokenReqParams)
      } catch (e) {
        this.$toast.error(e, {
          icon: "code",
        })
      }
    },
    async oauthRedirectReq() {
      const tokenInfo = await oauthRedirect()
      if (Object.prototype.hasOwnProperty.call(tokenInfo, "access_token")) {
        this.request = { ...this.request, bearerToken: tokenInfo.access_token }
        this.addOAuthToken({
          name: this.oauth2.accessTokenName,
          value: tokenInfo.access_token,
        })
      }
    },
    addOAuthToken({ name, value }) {
      this.$store.commit("addOAuthToken", {
        name,
        value,
      })
      return false
    },
    removeOAuthToken(index) {
      const oldTokens = this.oauth2.tokens.slice()
      this.$store.commit("removeOAuthToken", index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.oauth2 = { ...this.oauth2, tokens: oldTokens }
            toastObject.remove()
          },
        },
      })
    },
    useOAuthToken(value) {
      this.request = { ...this.request, bearerToken: value }
      this.showTokenListModal = false
    },
    addOAuthTokenReq() {
      try {
        const name = this.oauth2.tokenReqName
        const details = JSON.parse(this.tokenReqDetails)
        this.$store.commit("addOAuthTokenReq", {
          name,
          details,
        })
        this.$toast.info(this.$t("token_request_saved"))
        this.showTokenRequestList = false
      } catch (e) {
        this.$toast.error(e, {
          icon: "code",
        })
      }
    },
    removeOAuthTokenReq(index) {
      const oldTokenReqs = this.oauth2.tokenReqs.slice()
      const targetReqIndex = this.oauth2.tokenReqs.findIndex(
        ({ name }) => name === this.oauth2.tokenReqName
      )
      if (targetReqIndex < 0) return
      this.$store.commit("removeOAuthTokenReq", targetReqIndex)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.oauth2 = { ...this.oauth2, tokenReqs: oldTokenReqs }
            toastObject.remove()
          },
        },
      })
    },
    tokenReqChange($event) {
      const { details, name } = this.oauth2.tokenReqs.find(
        ({ name }) => name === $event.target.value
      )
      const { oidcDiscoveryUrl, authUrl, accessTokenUrl, clientId, scope } = details
      this.oauth2 = {
        ...this.oauth2,
        tokenReqName: name,
        oidcDiscoveryUrl: oidcDiscoveryUrl,
        authUrl: authUrl,
        accessTokenUrl: accessTokenUrl,
        clientId: clientId,
        scope: scope,
      }
    },
    setRequestType(val) {
      this.request = { ...this.request, requestType: val }
    },
  },
  async mounted() {
    // this.observeRequestButton()
    this._keyListener = function (e) {
      if (e.key === "g" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (!this.runningRequest) {
          this.sendRequest()
        } else {
          this.cancelRequest()
        }
      }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        this.saveRequest()
      }
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        this.copyRequest()
      }
      if (e.key === "i" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        this.$refs.clearAll.click()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        this.showCurlImportModal = this.showTokenListModal = this.showTokenRequestList = this.showSaveRequestModal = this.showCodegenModal = false
      }
      if ((e.key === "g" || e.key === "G") && e.altKey) {
        this.request = { ...this.request, method: "GET" }
      }
      if ((e.key === "h" || e.key === "H") && e.altKey) {
        this.request = { ...this.request, method: "HEAD" }
      }
      if ((e.key === "p" || e.key === "P") && e.altKey) {
        this.request = { ...this.request, method: "POST" }
      }
      if ((e.key === "u" || e.key === "U") && e.altKey) {
        this.request = { ...this.request, method: "PUT" }
      }
      if ((e.key === "x" || e.key === "X") && e.altKey) {
        this.request = { ...this.request, method: "DELETE" }
      }
      if (e.key == "ArrowUp" && e.altKey && this.currentMethodIndex > 0) {
        this.request = {
          ...this.request,
          method: this.methodMenuItems[--this.currentMethodIndex % this.methodMenuItems.length],
        }
      } else if (e.key == "ArrowDown" && e.altKey && this.currentMethodIndex < 9) {
        this.request = {
          ...this.request,
          method: this.methodMenuItems[++this.currentMethodIndex % this.methodMenuItems.length],
        }
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))
    await this.oauthRedirectReq()
  },
  created() {
    if (Object.keys(this.$route.query).length) this.setRouteQueries(this.$route.query)
    this.$watch(
      (vm) => [vm.request, vm.url, vm.path],
      (val) => {
        this.setRouteQueryState()
      }
    )
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
