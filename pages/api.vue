<template>
  <!-- eslint-disable -->
  <div>
    <Splitpanes vertical class="hoppscotch-theme">
      <Pane min-size="60" class="bg-violet-100">
        <Splitpanes horizontal class="hoppscotch-theme">
          <Pane class="bg-indigo-100">
            <AppSection ref="request" label="request">
              <ul>
                <li class="shrink">
                  <label for="method">{{ $t("method") }}</label>
                  <span class="select-wrapper">
                    <tippy tabindex="-1" trigger="click" theme="popover" arrow>
                      <template #trigger>
                        <input
                          id="method"
                          class="input drop-down-input"
                          v-model="method"
                          :readonly="!customMethod"
                          autofocus
                        />
                      </template>
                      <div
                        v-for="(methodMenuItem, index) in methodMenuItems"
                        :key="`method-${index}`"
                      >
                        <ButtonSecondary
                          @click.native="
                            customMethod =
                              methodMenuItem == 'CUSTOM' ? true : false
                            method = methodMenuItem
                          "
                        />
                        {{ methodMenuItem }}
                      </div>
                    </tippy>
                  </span>
                </li>
                <li>
                  <label for="url">{{ $t("url") }}</label>
                  <input
                    v-if="!EXPERIMENTAL_URL_BAR_ENABLED"
                    :class="{ error: !isValidURL }"
                    class="input border-dashed md:border-l border-divider"
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
                  <ButtonSecondary
                    v-if="!runningRequest"
                    :disabled="!isValidURL"
                    @click.native="sendRequest"
                    id="send"
                    class="button"
                    ref="sendButton"
                    icon="send"
                    :label="$t('send')"
                  />
                  <ButtonSecondary
                    v-else
                    @click.native="cancelRequest"
                    id="send"
                    class="button"
                    ref="sendButton"
                    icon="clear"
                    :label="$t('cancel')"
                    reverse
                  />
                </li>
              </ul>
              <ul>
                <li>
                  <label for="request-name" class="text-sm">
                    {{ $t("token_req_name") }}
                  </label>
                  <input
                    id="request-name"
                    name="request-name"
                    type="text"
                    v-model="name"
                    class="input text-sm"
                  />
                </li>
              </ul>
              <div
                label="Request Body"
                v-if="['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)"
              >
                <ul>
                  <li>
                    <label for="contentType" class="text-sm">{{
                      $t("content_type")
                    }}</label>
                    <span class="select-wrapper">
                      <tippy
                        tabindex="-1"
                        trigger="click"
                        theme="popover"
                        arrow
                      >
                        <template #trigger>
                          <input
                            id="contentType"
                            class="input drop-down-input"
                            v-model="contentType"
                            readonly
                          />
                        </template>
                        <div
                          v-for="(
                            contentTypeMenuItem, index
                          ) in validContentTypes"
                          :key="`content-type-${index}`"
                        >
                          <ButtonSecondary
                            @click.native="contentType = contentTypeMenuItem"
                          />
                          {{ contentTypeMenuItem }}
                        </div>
                      </tippy>
                    </span>
                    <!-- <SmartAutoComplete
                  :source="validContentTypes"
                  :spellcheck="false"
                  v-model="contentType"
                  styles="text-sm"
                /> -->
                  </li>
                </ul>
                <ul>
                  <li>
                    <div class="row-wrapper">
                      <span>
                        <SmartToggle
                          v-if="canListParameters"
                          :on="rawInput"
                          @change="rawInput = $event"
                        >
                          {{ $t("raw_input") }}
                        </SmartToggle>
                      </span>
                    </div>
                  </li>
                </ul>
                <HttpBodyParameters
                  v-if="!rawInput"
                  :bodyParams="bodyParams"
                  @clear-content="clearContent"
                  @set-route-query-state="setRouteQueryState"
                  @remove-request-body-param="removeRequestBodyParam"
                  @add-request-body-param="addRequestBodyParam"
                />
                <HttpRawBody
                  v-else
                  :rawParams="rawParams"
                  :contentType="contentType"
                  :rawInput="rawInput"
                  @clear-content="clearContent"
                  @update-raw-body="updateRawBody"
                  @update-raw-input="
                    updateRawInput = (value) => (rawInput = value)
                  "
                />
              </div>
              <div class="row-wrapper">
                <span>
                  <ButtonSecondary
                    @click.native="showCurlImportModal = !showCurlImportModal"
                    v-tippy="{ theme: 'tooltip' }"
                    :title="$t('import_curl')"
                    icon="import_export"
                  />
                  <ButtonSecondary
                    @click.native="showCodegenModal = !showCodegenModal"
                    :disabled="!isValidURL"
                    v-tippy="{ theme: 'tooltip' }"
                    :title="$t('show_code')"
                    icon="code"
                  />
                </span>
                <span>
                  <ButtonSecondary
                    @click.native="copyRequest"
                    ref="copyRequest"
                    :disabled="!isValidURL"
                    v-tippy="{ theme: 'tooltip' }"
                    :title="$t('copy_request_link')"
                    :icon="navigatorShare ? 'share' : 'content_copy'"
                  />
                  <ButtonSecondary
                    @click.native="saveRequest"
                    ref="saveRequest"
                    :disabled="!isValidURL"
                    v-tippy="{ theme: 'tooltip' }"
                    :title="$t('save_to_collections')"
                    icon="create_new_folder"
                  />
                  <ButtonSecondary
                    @click.native="clearContent('', $event)"
                    v-tippy="{ theme: 'tooltip' }"
                    :title="$t('clear_all')"
                    ref="clearAll"
                    icon="clear_all"
                  />
                </span>
              </div>
            </AppSection>
            <section id="options">
              <SmartTabs>
                <SmartTab
                  :id="'params'"
                  :label="
                    $t('parameters') +
                    `${
                      params.length !== 0 ? ' \xA0 • \xA0 ' + params.length : ''
                    }`
                  "
                  :selected="true"
                >
                  <HttpParameters
                    :params="params"
                    @clear-content="clearContent"
                    @remove-request-param="removeRequestParam"
                    @add-request-param="addRequestParam"
                  />
                </SmartTab>

                <SmartTab
                  :id="'headers'"
                  :label="
                    $t('headers') +
                    `${
                      headers.length !== 0
                        ? ' \xA0 • \xA0 ' + headers.length
                        : ''
                    }`
                  "
                >
                  <HttpHeaders
                    :headers="headers"
                    @clear-content="clearContent"
                    @set-route-query-state="setRouteQueryState"
                    @remove-request-header="removeRequestHeader"
                    @add-request-header="addRequestHeader"
                  />
                </SmartTab>

                <SmartTab :id="'authentication'" :label="$t('authentication')">
                  <AppSection label="authentication">
                    <ul>
                      <li>
                        <div class="row-wrapper">
                          <label for="auth">{{ $t("authentication") }}</label>
                          <div>
                            <ButtonSecondary
                              @click.native="clearContent('auth', $event)"
                              v-tippy="{ theme: 'tooltip' }"
                              :title="$t('clear')"
                              icon="clear_all"
                            />
                          </div>
                        </div>
                        <span class="select-wrapper">
                          <select class="select" id="auth" v-model="auth">
                            <option>None</option>
                            <option>Basic Auth</option>
                            <option>Bearer Token</option>
                            <option>OAuth 2.0</option>
                          </select>
                        </span>
                      </li>
                    </ul>
                    <ul v-if="auth === 'Basic Auth'">
                      <li>
                        <input
                          class="input"
                          placeholder="User"
                          name="http_basic_user"
                          v-model="httpUser"
                        />
                      </li>
                      <li>
                        <input
                          class="input"
                          placeholder="Password"
                          name="http_basic_passwd"
                          :type="passwordFieldType"
                          v-model="httpPassword"
                        />
                      </li>
                      <div>
                        <li>
                          <ButtonSecondary
                            ref="switchVisibility"
                            @click.native="switchVisibility"
                            :icon="
                              passwordFieldType === 'text'
                                ? 'visibility'
                                : 'visibility_off'
                            "
                          />
                        </li>
                      </div>
                    </ul>
                    <ul v-if="auth === 'Bearer Token' || auth === 'OAuth 2.0'">
                      <li>
                        <div class="row-wrapper">
                          <input
                            class="input"
                            placeholder="Token"
                            name="bearer_token"
                            v-model="bearerToken"
                          />
                          <ButtonSecondary
                            v-if="auth === 'OAuth 2.0'"
                            @click.native="
                              showTokenListModal = !showTokenListModal
                            "
                            v-tippy="{ theme: 'tooltip' }"
                            :title="$t('use_token')"
                            icon="open_in_new"
                          />
                          <ButtonSecondary
                            v-if="auth === 'OAuth 2.0'"
                            @click.native="showTokenRequest = !showTokenRequest"
                            v-tippy="{ theme: 'tooltip' }"
                            :title="$t('get_token')"
                            icon="vpn_key"
                          />
                        </div>
                      </li>
                    </ul>
                    <div class="row-wrapper">
                      <SmartToggle
                        :on="!URL_EXCLUDES.auth"
                        @change="setExclude('auth', !$event)"
                      >
                        {{ $t("include_in_url") }}
                      </SmartToggle>
                    </div>
                  </AppSection>

                  <AppSection
                    v-if="showTokenRequest"
                    label="accessTokenRequest"
                  >
                    <ul>
                      <li>
                        <div class="row-wrapper">
                          <label for="token-name">{{ $t("token_name") }}</label>
                          <div>
                            <ButtonSecondary
                              @click.native="showTokenRequestList = true"
                              v-tippy="{ theme: 'tooltip' }"
                              :title="$t('manage_token_req')"
                              icon="library_add"
                            />
                            <ButtonSecondary
                              @click.native="
                                clearContent('access_token', $event)
                              "
                              v-tippy="{ theme: 'tooltip' }"
                              :title="$t('clear')"
                              icon="clear_all"
                            />
                            <ButtonSecondary
                              @click.native="showTokenRequest = false"
                              v-tippy="{ theme: 'tooltip' }"
                              :title="$t('close')"
                              icon="close"
                            />
                          </div>
                        </div>
                        <input
                          class="input"
                          id="token-name"
                          :placeholder="$t('optional')"
                          name="token_name"
                          v-model="accessTokenName"
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
                          class="input"
                          :disabled="
                            this.authUrl !== '' || this.accessTokenUrl !== ''
                          "
                          id="oidc-discovery-url"
                          name="oidc_discovery_url"
                          type="url"
                          v-model="oidcDiscoveryUrl"
                          placeholder="https://example.com/.well-known/openid-configuration"
                        />
                      </li>
                    </ul>
                    <ul>
                      <li>
                        <label for="auth-url">{{ $t("auth_url") }}</label>
                        <input
                          class="input"
                          :disabled="this.oidcDiscoveryUrl !== ''"
                          id="auth-url"
                          name="auth_url"
                          type="url"
                          v-model="authUrl"
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
                          class="input"
                          :disabled="this.oidcDiscoveryUrl !== ''"
                          id="access-token-url"
                          name="access_token_url"
                          type="url"
                          v-model="accessTokenUrl"
                          placeholder="https://example.com/login/oauth/access_token"
                        />
                      </li>
                    </ul>
                    <ul>
                      <li>
                        <label for="client-id">{{ $t("client_id") }}</label>
                        <input
                          class="input"
                          id="client-id"
                          name="client_id"
                          type="text"
                          v-model="clientId"
                          placeholder="Client ID"
                        />
                      </li>
                    </ul>
                    <ul>
                      <li>
                        <label for="scope">{{ $t("scope") }}</label>
                        <input
                          class="input"
                          id="scope"
                          name="scope"
                          type="text"
                          v-model="scope"
                          placeholder="e.g. read:org"
                        />
                      </li>
                    </ul>
                    <ul>
                      <li>
                        <ButtonSecondary
                          @click.native="handleAccessTokenRequest"
                          icon="vpn_key"
                          :label="$t('request_token')"
                        />
                      </li>
                    </ul>
                  </AppSection>
                </SmartTab>

                <SmartTab
                  :id="'pre_request_script'"
                  :label="$t('pre_request_script')"
                >
                  <AppSection v-if="showPreRequestScript" label="preRequest">
                    <ul>
                      <li>
                        <div class="row-wrapper">
                          <label>{{ $t("javascript_code") }}</label>
                          <div>
                            <ButtonSecondary
                              to="https://github.com/hoppscotch/hoppscotch/wiki/Pre-Request-Scripts"
                              blank
                              v-tippy="{ theme: 'tooltip' }"
                              :title="$t('wiki')"
                              icon="help_outline"
                            />
                          </div>
                        </div>
                        <SmartJsEditor
                          v-model="preRequestScript"
                          :options="{
                            maxLines: '16',
                            minLines: '8',
                            fontSize: '15px',
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
                  <AppSection v-if="testsEnabled" label="postRequestTests">
                    <ul>
                      <li>
                        <div class="row-wrapper">
                          <label>{{ $t("javascript_code") }}</label>
                          <div>
                            <ButtonSecondary
                              to="https://github.com/hoppscotch/hoppscotch/wiki/Post-Request-Tests"
                              blank
                              v-tippy="{ theme: 'tooltip' }"
                              :title="$t('wiki')"
                              icon="help_outline"
                            />
                          </div>
                        </div>
                        <SmartJsEditor
                          v-model="testScript"
                          :options="{
                            maxLines: '16',
                            minLines: '8',
                            fontSize: '15px',
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
                              <ButtonSecondary
                                @click.native="clearContent('tests', $event)"
                                v-tippy="{ theme: 'tooltip' }"
                                :title="$t('clear')"
                                icon="clear_all"
                              />
                            </div>
                          </div>
                          <div
                            v-for="(testReport, index) in testReports"
                            :key="index"
                          >
                            <div v-if="testReport.startBlock">
                              <hr />
                              <h4 class="heading">
                                {{ testReport.startBlock }}
                              </h4>
                            </div>
                            <p
                              v-else-if="testReport.result"
                              class="row-wrapper info"
                            >
                              <span :class="testReport.styles.class">
                                <i class="material-icons">
                                  {{ testReport.styles.icon }}
                                </i>
                                <span>&nbsp; {{ testReport.result }}</span>
                                <span v-if="testReport.message">
                                  <label
                                    >&nbsp; • &nbsp;
                                    {{ testReport.message }}</label
                                  >
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
          </Pane>
          <Pane class="bg-purple-100">
            <HttpResponse
              :response="response"
              :active="runningRequest"
              ref="response"
            />
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane max-size="40" class="bg-pink-100">
        <TranslateSlideLeft>
          <aside class="lg:max-w-md">
            <section>
              <SmartTabs>
                <SmartTab
                  :id="'history'"
                  :label="$t('history')"
                  :selected="true"
                >
                  <History
                    :page="'rest'"
                    @useHistory="handleUseHistory"
                    ref="historyComponent"
                  />
                </SmartTab>

                <SmartTab :id="'collections'" :label="$t('collections')">
                  <Collections />
                </SmartTab>

                <SmartTab :id="'env'" :label="$t('environments')">
                  <Environments />
                </SmartTab>
              </SmartTabs>
            </section>
          </aside>
        </TranslateSlideLeft>
      </Pane>
    </Splitpanes>

    <CollectionsSaveRequest
      mode="rest"
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
      :requestTypeProp="requestType"
      :requestCode="requestCode"
      @hide-modal="showCodegenModal = false"
      @set-request-type="setRequestType"
    />

    <HttpTokenList
      :show="showTokenListModal"
      :tokens="tokens"
      @clear-content="clearContent"
      @use-oauth-token="useOAuthToken"
      @remove-oauth-token="removeOAuthToken"
      @hide-modal="showTokenListModal = false"
    />

    <SmartModal
      v-if="showTokenRequestList"
      @close="showTokenRequestList = false"
    >
      <template #header>
        <h3 class="heading">{{ $t("manage_token_req") }}</h3>
        <div>
          <ButtonSecondary
            @click.native="showTokenRequestList = false"
            icon="close"
          />
        </div>
      </template>
      <template #body>
        <div class="row-wrapper">
          <label for="token-req-list">{{ $t("token_req_list") }}</label>
          <div>
            <ButtonSecondary
              :disabled="this.tokenReqs.length === 0"
              @click.native="showTokenRequestList = false"
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('use_token_req')"
              icon="input"
            />
            <ButtonSecondary
              :disabled="this.tokenReqs.length === 0"
              @click.native="removeOAuthTokenReq"
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('delete')"
              icon="delete"
            />
          </div>
        </div>
        <ul>
          <li>
            <span class="select-wrapper">
              <select
                id="token-req-list"
                class="select"
                v-model="tokenReqSelect"
                :disabled="this.tokenReqs.length === 0"
                @change="tokenReqChange($event)"
              >
                <option
                  v-for="(req, index) in tokenReqs"
                  :key="index"
                  :value="req.name"
                >
                  {{ req.name }}
                </option>
              </select>
            </span>
          </li>
        </ul>
        <label for="token-req-name">{{ $t("token_req_name") }}</label>
        <input class="input" v-model="tokenReqName" />
        <label for="token-req-details">
          {{ $t("token_req_details") }}
        </label>
        <textarea
          id="token-req-details"
          class="textarea"
          readonly
          rows="7"
          v-model="tokenReqDetails"
        ></textarea>
      </template>
      <template #footer>
        <span></span>
        <span>
          <ButtonPrimary @click.native="addOAuthTokenReq" />
          {{ $t("save_token_req") }}
        </span>
      </template>
    </SmartModal>
  </div>
</template>

<script>
/* eslint-disable */
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"

import url from "url"
import querystring from "querystring"
import parseCurlCommand from "~/helpers/curlparser"
import getEnvironmentVariablesFromScript from "~/helpers/preRequest"
import runTestScriptWithVariables from "~/helpers/postwomanTesting"
import parseTemplateString from "~/helpers/templating"
import { tokenRequest, oauthRedirect } from "~/helpers/oauth"
import { cancelRunningRequest, sendNetworkRequest } from "~/helpers/network"
import {
  hasPathParams,
  addPathParamsToVariables,
  getQueryParams,
} from "~/helpers/requestParams"
import { parseUrlAndPath } from "~/helpers/utils/uri"
import { httpValid } from "~/helpers/utils/valid"
import {
  knownContentTypes,
  isJSONContentType,
} from "~/helpers/utils/contenttypes"
import { generateCodeWithGenerator } from "~/helpers/codegen/codegen"
import { getSettingSubject, applySetting } from "~/newstore/settings"
import { addRESTHistoryEntry } from "~/newstore/history"
import clone from "lodash/clone"

export default {
  components: { Splitpanes, Pane },

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
      EXPERIMENTAL_URL_BAR_ENABLED: getSettingSubject(
        "EXPERIMENTAL_URL_BAR_ENABLED"
      ),
    }
  },
  watch: {
    canListParameters: {
      immediate: true,
      handler(canListParameters) {
        if (canListParameters) {
          this.$nextTick(() => {
            this.rawInput = Boolean(this.rawParams && this.rawParams !== "{}")
          })
        } else {
          this.rawInput = true
        }
      },
    },
    contentType(contentType, oldContentType) {
      const getDefaultParams = (contentType) => {
        if (isJSONContentType(contentType)) return "{}"
        switch (contentType) {
          case "application/xml":
            return "<?xml version='1.0' encoding='utf-8'?>"
          case "text/html":
            return "<!doctype html>"
        }
        return ""
      }
      if (
        !this.rawParams ||
        this.rawParams === getDefaultParams(oldContentType)
      ) {
        this.rawParams = getDefaultParams(contentType)
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
    selectedRequest(newValue) {
      // @TODO: Convert all variables to single request variable
      if (!newValue) return
      this.uri = newValue.url + newValue.path
      this.url = newValue.url
      this.path = newValue.path
      this.method = newValue.method
      this.auth = newValue.auth
      this.httpUser = newValue.httpUser
      this.httpPassword = newValue.httpPassword
      this.passwordFieldType = newValue.passwordFieldType
      this.bearerToken = newValue.bearerToken
      this.headers = newValue.headers
      this.params = newValue.params
      this.bodyParams = newValue.bodyParams
      this.rawParams = newValue.rawParams
      this.rawInput = newValue.rawInput
      this.contentType = newValue.contentType
      this.requestType = newValue.requestType
      if (newValue.preRequestScript) {
        this.showPreRequestScript = true
        this.preRequestScript = newValue.preRequestScript
      }
      if (newValue.testScript) {
        this.testsEnabled = true
        this.testScript = newValue.testScript
      }
      this.name = newValue.name
    },
    method() {
      this.contentType = ["POST", "PUT", "PATCH", "DELETE"].includes(
        this.method
      )
        ? this.contentType
        : "application/json"
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
        this.contentType === "application/x-www-form-urlencoded" ||
        this.contentType === "multipart/form-data" ||
        isJSONContentType(this.contentType)
      )
    },
    uri: {
      get() {
        return this.$store.state.request.uri
          ? this.$store.state.request.uri
          : this.url + this.path
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "uri" })
        let url = value
        if (
          (this.preRequestScript && this.showPreRequestScript) ||
          hasPathParams(this.params)
        ) {
          let environmentVariables = getEnvironmentVariablesFromScript(
            this.preRequestScript
          )
          environmentVariables = addPathParamsToVariables(
            this.params,
            environmentVariables
          )
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
    method: {
      get() {
        return this.$store.state.request.method
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "method" })
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
    name: {
      get() {
        return this.$store.state.request.name
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "name" })
      },
    },
    auth: {
      get() {
        return this.$store.state.request.auth
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "auth" })
      },
    },
    httpUser: {
      get() {
        return this.$store.state.request.httpUser
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "httpUser" })
      },
    },
    httpPassword: {
      get() {
        return this.$store.state.request.httpPassword
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "httpPassword" })
      },
    },
    bearerToken: {
      get() {
        return this.$store.state.request.bearerToken
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "bearerToken" })
      },
    },
    tokens: {
      get() {
        return this.$store.state.oauth2.tokens
      },
      set(value) {
        this.$store.commit("setOAuth2", { value, attribute: "tokens" })
      },
    },
    tokenReqs: {
      get() {
        return this.$store.state.oauth2.tokenReqs
      },
      set(value) {
        this.$store.commit("setOAuth2", { value, attribute: "tokenReqs" })
      },
    },
    tokenReqSelect: {
      get() {
        return this.$store.state.oauth2.tokenReqSelect
      },
      set(value) {
        this.$store.commit("setOAuth2", { value, attribute: "tokenReqSelect" })
      },
    },
    tokenReqName: {
      get() {
        return this.$store.state.oauth2.tokenReqName
      },
      set(value) {
        this.$store.commit("setOAuth2", { value, attribute: "tokenReqName" })
      },
    },
    accessTokenName: {
      get() {
        return this.$store.state.oauth2.accessTokenName
      },
      set(value) {
        this.$store.commit("setOAuth2", {
          value,
          attribute: "accessTokenName",
        })
      },
    },
    oidcDiscoveryUrl: {
      get() {
        return this.$store.state.oauth2.oidcDiscoveryUrl
      },
      set(value) {
        this.$store.commit("setOAuth2", {
          value,
          attribute: "oidcDiscoveryUrl",
        })
      },
    },
    authUrl: {
      get() {
        return this.$store.state.oauth2.authUrl
      },
      set(value) {
        this.$store.commit("setOAuth2", { value, attribute: "authUrl" })
      },
    },
    accessTokenUrl: {
      get() {
        return this.$store.state.oauth2.accessTokenUrl
      },
      set(value) {
        this.$store.commit("setOAuth2", { value, attribute: "accessTokenUrl" })
      },
    },
    clientId: {
      get() {
        return this.$store.state.oauth2.clientId
      },
      set(value) {
        this.$store.commit("setOAuth2", { value, attribute: "clientId" })
      },
    },
    scope: {
      get() {
        return this.$store.state.oauth2.scope
      },
      set(value) {
        this.$store.commit("setOAuth2", { value, attribute: "scope" })
      },
    },
    state: {
      get() {
        return this.$store.state.oauth2.state
      },
      set(value) {
        this.$store.commit("setOAuth2", { value, attribute: "state" })
      },
    },
    headers: {
      get() {
        return this.$store.state.request.headers
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "headers" })
      },
    },
    params: {
      get() {
        return this.$store.state.request.params
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "params" })
      },
    },
    bodyParams: {
      get() {
        return this.$store.state.request.bodyParams
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "bodyParams" })
      },
    },
    rawParams: {
      get() {
        return this.$store.state.request.rawParams
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "rawParams" })
        // Convert the rawParams to bodyParams format
        try {
          const valueObj = JSON.parse(value)
          const params = Object.keys(valueObj).map((key) => {
            if (typeof valueObj[key] !== "function") {
              return {
                active: true,
                key,
                value: valueObj[key],
              }
            }
          })
          this.$store.commit("setBodyParams", { params })
        } catch {}
      },
    },
    rawInput: {
      get() {
        return this.$store.state.request.rawInput
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "rawInput" })
      },
    },
    requestType: {
      get() {
        return this.$store.state.request.requestType
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "requestType" })
      },
    },
    contentType: {
      get() {
        return this.$store.state.request.contentType
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "contentType" })
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
    requestName() {
      return this.name
    },
    isValidURL() {
      // if showPreRequestScript, we cannot determine if a URL is valid because the full string is not known ahead of time
      return this.showPreRequestScript || httpValid(this.url)
    },
    hasRequestBody() {
      return ["POST", "PUT", "PATCH", "DELETE"].includes(this.method)
    },
    pathName() {
      return this.path.match(/^([^?]*)\??/)[1]
    },
    rawRequestBody() {
      const { bodyParams, contentType } = this
      if (isJSONContentType(contentType)) {
        try {
          const obj = JSON.parse(
            `{${bodyParams
              .filter((item) =>
                item.hasOwnProperty("active") ? item.active == true : true
              )
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
        return bodyParams
          .filter((item) =>
            item.hasOwnProperty("active") ? item.active == true : true
          )
          .filter(({ key }) => !!key)
          .map(
            ({ key, value }) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
          )
          .join("&")
      }
    },
    queryString() {
      const result = getQueryParams(this.params)
        .map(
          ({ key, value }) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        )
        .join("&")
      return result === "" ? "" : `?${result}`
    },
    requestCode() {
      let headers = []
      if (this.preRequestScript || hasPathParams(this.params)) {
        let environmentVariables = getEnvironmentVariablesFromScript(
          this.preRequestScript
        )
        environmentVariables = addPathParamsToVariables(
          this.params,
          environmentVariables
        )
        for (let k of this.headers.filter((item) =>
          item.hasOwnProperty("active") ? item.active == true : true
        )) {
          const kParsed = parseTemplateString(k.key, environmentVariables)
          const valParsed = parseTemplateString(k.value, environmentVariables)
          headers.push({ key: kParsed, value: valParsed })
        }
      }

      return generateCodeWithGenerator(this.requestType, {
        auth: this.auth,
        method: this.method,
        url: this.url,
        pathName: this.pathName,
        queryString: this.queryString,
        httpUser: this.httpUser,
        httpPassword: this.httpPassword,
        bearerToken: this.bearerToken,
        headers,
        rawInput: this.rawInput,
        rawParams: this.rawParams,
        rawRequestBody: this.rawRequestBody,
        contentType: this.contentType,
      })
    },
    tokenReqDetails() {
      const details = {
        oidcDiscoveryUrl: this.oidcDiscoveryUrl,
        authUrl: this.authUrl,
        accessTokenUrl: this.accessTokenUrl,
        clientId: this.clientId,
        scope: this.scope,
      }
      return JSON.stringify(details, null, 2)
    },
  },
  methods: {
    scrollInto(view) {
      this.$refs[view].$el.scrollIntoView({
        behavior: "smooth",
      })
    },
    handleUseHistory(entry) {
      this.name = entry.name
      this.method = entry.method
      this.uri = entry.url + entry.path
      this.url = entry.url
      this.path = entry.path
      this.showPreRequestScript = entry.usesPreScripts
      this.preRequestScript = entry.preRequestScript
      this.auth = entry.auth
      this.httpUser = entry.httpUser
      this.httpPassword = entry.httpPassword
      this.bearerToken = entry.bearerToken
      this.headers = entry.headers
      this.params = entry.params
      this.bodyParams = entry.bodyParams
      this.rawParams = entry.rawParams
      this.rawInput = entry.rawInput
      this.contentType = entry.contentType
      this.requestType = entry.requestType
      this.testScript = entry.testScript
      this.testsEnabled = entry.usesPostScripts
      if (this.SCROLL_INTO_ENABLED) this.scrollInto("request")
    },
    async makeRequest(auth, headers, requestBody, preRequestScript) {
      const requestOptions = {
        method: this.method,
        url: this.url + this.pathName + this.queryString,
        auth,
        headers,
        data: requestBody,
        credentials: true,
      }

      if (preRequestScript || hasPathParams(this.params)) {
        let environmentVariables =
          getEnvironmentVariablesFromScript(preRequestScript)
        environmentVariables = addPathParamsToVariables(
          this.params,
          environmentVariables
        )
        requestOptions.url = parseTemplateString(
          requestOptions.url,
          environmentVariables
        )
        if (!(requestOptions.data instanceof FormData)) {
          // TODO: Parse env variables for form data too
          requestOptions.data = parseTemplateString(
            requestOptions.data,
            environmentVariables
          )
        }
        for (let k in requestOptions.headers) {
          const kParsed = parseTemplateString(k, environmentVariables)
          const valParsed = parseTemplateString(
            requestOptions.headers[k],
            environmentVariables
          )
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
        this.auth === "Basic Auth"
          ? {
              username: this.httpUser,
              password: this.httpPassword,
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
        requestBody = this.rawInput ? this.rawParams : this.rawRequestBody
        Object.assign(headers, {
          "Content-Type": `${this.contentType}; charset=utf-8`,
        })
      }
      requestBody = requestBody ? requestBody.toString() : null
      if (this.contentType === "multipart/form-data") {
        const formData = new FormData()
        for (const bodyParam of this.bodyParams.filter((item) =>
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
      if (this.auth === "Bearer Token" || this.auth === "OAuth 2.0")
        headers["Authorization"] = `Bearer ${this.bearerToken}`
      headers = Object.assign(
        // Clone the app headers object first, we don't want to
        // mutate it with the request headers added by default.
        Object.assign(
          {},
          this.headers.filter((item) =>
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
            name: this.requestName,
            status: this.response.status,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            updatedOn: new Date(),
            method: this.method,
            url: this.url,
            path: this.path,
            usesPreScripts: this.showPreRequestScript,
            preRequestScript: this.preRequestScript,
            duration,
            star: false,
            auth: this.auth,
            httpUser: this.httpUser,
            httpPassword: this.httpPassword,
            bearerToken: this.bearerToken,
            headers: this.headers,
            params: this.params,
            bodyParams: this.bodyParams,
            rawParams: this.rawParams,
            rawInput: this.rawInput,
            contentType: this.contentType,
            requestType: this.requestType,
            testScript: this.testScript,
            usesPostScripts: this.testsEnabled,
          }

          if (
            (this.preRequestScript && this.showPreRequestScript) ||
            hasPathParams(this.params)
          ) {
            let environmentVariables = getEnvironmentVariablesFromScript(
              this.preRequestScript
            )
            environmentVariables = addPathParamsToVariables(
              this.params,
              environmentVariables
            )
            entry.path = parseTemplateString(entry.path, environmentVariables)
            entry.url = parseTemplateString(entry.url, environmentVariables)
          }

          addRESTHistoryEntry(entry)
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
              name: this.requestName,
              status: this.response.status,
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              updatedOn: new Date(),
              method: this.method,
              url: this.url,
              path: this.path,
              usesPreScripts: this.showPreRequestScript,
              preRequestScript: this.preRequestScript,
              star: false,
              auth: this.auth,
              httpUser: this.httpUser,
              httpPassword: this.httpPassword,
              bearerToken: this.bearerToken,
              headers: this.headers,
              params: this.params,
              bodyParams: this.bodyParams,
              rawParams: this.rawParams,
              rawInput: this.rawInput,
              contentType: this.contentType,
              requestType: this.requestType,
              testScript: this.testScript,
              usesPostScripts: this.testsEnabled,
            }

            if (
              (this.preRequestScript && this.showPreRequestScript) ||
              hasPathParams(this.params)
            ) {
              let environmentVariables = getEnvironmentVariablesFromScript(
                this.preRequestScript
              )
              environmentVariables = addPathParamsToVariables(
                this.params,
                environmentVariables
              )
              entry.path = parseTemplateString(entry.path, environmentVariables)
              entry.url = parseTemplateString(entry.url, environmentVariables)
            }

            addRESTHistoryEntry(entry)
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
            new TextDecoder("utf-8").decode(
              new Uint8Array(syntheticResponse.body)
            )
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
        let environmentVariables = getEnvironmentVariablesFromScript(
          this.preRequestScript
        )
        environmentVariables = addPathParamsToVariables(
          this.params,
          environmentVariables
        )
        const params = this.queryStringToArray(queryString)
        let parsedParams = []
        for (let k of params.filter((item) =>
          item.hasOwnProperty("active") ? item.active == true : true
        )) {
          const kParsed = parseTemplateString(k.key, environmentVariables)
          const valParsed = parseTemplateString(k.value, environmentVariables)
          parsedParams.push({ key: kParsed, value: valParsed, active: true })
        }
        this.paramsWatchEnabled = false
        this.params = parsedParams
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
      const oldHeaders = this.headers.slice()
      this.$store.commit("removeHeaders", index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.headers = oldHeaders
            toastObject.remove()
          },
        },
      })
    },
    addRequestParam() {
      this.$store.commit("addParams", {
        key: "",
        value: "",
        type: "query",
        active: true,
      })
      return false
    },
    removeRequestParam(index) {
      // .slice() gives us an entirely new array rather than giving us just the reference
      const oldParams = this.params.slice()
      this.$store.commit("removeParams", index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.params = oldParams
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
            this.bodyParams = oldBodyParams
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
        setTimeout(
          () => (this.$refs.copyRequest.innerHTML = this.copyButton),
          1000
        )
      }
    },
    setRouteQueryState() {
      const flat = (key) => (this[key] !== "" ? `${key}=${this[key]}&` : "")
      const deep = (key) => {
        const haveItems = [...this[key]].length
        if (haveItems && this[key]["value"] !== "") {
          // Exclude files fro  query params
          const filesRemoved = this[key].filter(
            (item) => !(item?.value?.[0] instanceof File)
          )
          return `${key}=${JSON.stringify(filesRemoved)}&`
        }
        return ""
      }
      let flats = [
        "method",
        "url",
        "path",
        !this.URL_EXCLUDES.auth ? "auth" : null,
        !this.URL_EXCLUDES.httpUser ? "httpUser" : null,
        !this.URL_EXCLUDES.httpPassword ? "httpPassword" : null,
        !this.URL_EXCLUDES.bearerToken ? "bearerToken" : null,
        "contentType",
      ]
        .filter((item) => item !== null)
        .map((item) => flat(item))
      const deeps = ["headers", "params"].map((item) => deep(item))
      const bodyParams = this.rawInput
        ? [flat("rawParams")]
        : [deep("bodyParams")]
      history.replaceState(
        window.location.href,
        "",
        `${this.$router.options.base}?${encodeURI(
          flats.concat(deeps, bodyParams).join("").slice(0, -1)
        )}`
      )
    },
    setRouteQueries(queries) {
      if (typeof queries !== "object")
        throw new Error("Route query parameters must be a Object")
      for (const key in queries) {
        if (["headers", "params", "bodyParams"].includes(key))
          this[key] = JSON.parse(decodeURI(encodeURI(queries[key])))
        if (key === "rawParams") {
          this.rawInput = true
          this.rawParams = queries["rawParams"]
        } else if (typeof this[key] === "string") {
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
        const { origin, pathname } = new URL(
          parsedCurl.url.replace(/"/g, "").replace(/'/g, "")
        )
        this.url = origin
        this.path = pathname
        this.uri = this.url + this.path
        this.headers = []
        if (parsedCurl.query) {
          for (const key of Object.keys(parsedCurl.query)) {
            this.$store.commit("addParams", {
              key,
              value: parsedCurl.query[key],
              type: "query",
              active: true,
            })
          }
        }
        if (parsedCurl.headers) {
          for (const key of Object.keys(parsedCurl.headers)) {
            this.$store.commit("addHeaders", {
              key,
              value: parsedCurl.headers[key],
            })
          }
        }
        this.method = parsedCurl.method.toUpperCase()
        if (parsedCurl["data"]) {
          this.rawInput = true
          this.rawParams = parsedCurl["data"]
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
      this.passwordFieldType =
        this.passwordFieldType === "password" ? "text" : "password"
    },
    clearContent(name, { target }) {
      switch (name) {
        case "bodyParams":
          this.bodyParams = []
          this.files = []
          break
        case "rawParams":
          this.rawParams = "{}"
          break
        case "parameters":
          this.params = []
          break
        case "auth":
          this.auth = "None"
          this.httpUser = ""
          this.httpPassword = ""
          this.bearerToken = ""
          this.showTokenRequest = false
          this.tokens = []
          this.tokenReqs = []
          break
        case "access_token":
          this.accessTokenName = ""
          this.oidcDiscoveryUrl = ""
          this.authUrl = ""
          this.accessTokenUrl = ""
          this.clientId = ""
          this.scope = ""
          break
        case "headers":
          this.headers = []
          break
        case "tests":
          this.testReports = []
          break
        case "tokens":
          this.tokens = []
          break
        default:
          this.method = "GET"
          this.url = "https://httpbin.org"
          this.path = "/get"
          this.uri = this.url + this.path
          this.name = "Untitled request"
          this.bodyParams = []
          this.rawParams = "{}"
          this.files = []
          this.params = []
          this.auth = "None"
          this.httpUser = ""
          this.httpPassword = ""
          this.bearerToken = ""
          this.showTokenRequest = false
          this.tokens = []
          this.tokenReqs = []
          this.accessTokenName = ""
          this.oidcDiscoveryUrl = ""
          this.authUrl = ""
          this.accessTokenUrl = ""
          this.clientId = ""
          this.scope = ""
          this.headers = []
          this.testReports = []
      }
      target.innerHTML = this.doneButton
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(
        () => (target.innerHTML = '<i class="material-icons">clear_all</i>'),
        1000
      )
    },
    saveRequest() {
      let urlAndPath = parseUrlAndPath(this.uri)
      this.editRequest = {
        url: decodeURI(urlAndPath.url),
        path: decodeURI(urlAndPath.path),
        method: this.method,
        auth: this.auth,
        httpUser: this.httpUser,
        httpPassword: this.httpPassword,
        passwordFieldType: this.passwordFieldType,
        bearerToken: this.bearerToken,
        headers: this.headers,
        params: this.params,
        bodyParams: this.bodyParams,
        rawParams: this.rawParams,
        rawInput: this.rawInput,
        contentType: this.contentType,
        requestType: this.requestType,
        preRequestScript:
          this.showPreRequestScript == true ? this.preRequestScript : null,
        testScript: this.testsEnabled == true ? this.testScript : null,
        name: this.requestName,
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
      this.rawParams = rawParams
    },
    async handleAccessTokenRequest() {
      if (
        this.oidcDiscoveryUrl === "" &&
        (this.authUrl === "" || this.accessTokenUrl === "")
      ) {
        this.$toast.error(this.$t("complete_config_urls"), {
          icon: "error",
        })
        return
      }
      try {
        const tokenReqParams = {
          grantType: "code",
          oidcDiscoveryUrl: this.oidcDiscoveryUrl,
          authUrl: this.authUrl,
          accessTokenUrl: this.accessTokenUrl,
          clientId: this.clientId,
          scope: this.scope,
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
        this.bearerToken = tokenInfo.access_token
        this.addOAuthToken({
          name: this.accessTokenName,
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
      const oldTokens = this.tokens.slice()
      this.$store.commit("removeOAuthToken", index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.tokens = oldTokens
            toastObject.remove()
          },
        },
      })
    },
    useOAuthToken(value) {
      this.bearerToken = value
      this.showTokenListModal = false
    },
    addOAuthTokenReq() {
      try {
        const name = this.tokenReqName
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
      const oldTokenReqs = this.tokenReqs.slice()
      const targetReqIndex = this.tokenReqs.findIndex(
        ({ name }) => name === this.tokenReqName
      )
      if (targetReqIndex < 0) return
      this.$store.commit("removeOAuthTokenReq", targetReqIndex)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.tokenReqs = oldTokenReqs
            toastObject.remove()
          },
        },
      })
    },
    tokenReqChange({ target }) {
      const { details, name } = this.tokenReqs.find(
        ({ name }) => name === target.value
      )
      const { oidcDiscoveryUrl, authUrl, accessTokenUrl, clientId, scope } =
        details
      this.tokenReqName = name
      this.oidcDiscoveryUrl = oidcDiscoveryUrl
      this.authUrl = authUrl
      this.accessTokenUrl = accessTokenUrl
      this.clientId = clientId
      this.scope = scope
    },
    setRequestType(val) {
      this.requestType = val
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
      if ((e.key === "g" || e.key === "G") && e.altKey) {
        this.method = "GET"
      }
      if ((e.key === "h" || e.key === "H") && e.altKey) {
        this.method = "HEAD"
      }
      if ((e.key === "p" || e.key === "P") && e.altKey) {
        this.method = "POST"
      }
      if ((e.key === "u" || e.key === "U") && e.altKey) {
        this.method = "PUT"
      }
      if ((e.key === "x" || e.key === "X") && e.altKey) {
        this.method = "DELETE"
      }
      if (e.key == "ArrowUp" && e.altKey && this.currentMethodIndex > 0) {
        this.method =
          this.methodMenuItems[
            --this.currentMethodIndex % this.methodMenuItems.length
          ]
      } else if (
        e.key == "ArrowDown" &&
        e.altKey &&
        this.currentMethodIndex < 9
      ) {
        this.method =
          this.methodMenuItems[
            ++this.currentMethodIndex % this.methodMenuItems.length
          ]
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))
    await this.oauthRedirectReq()
  },
  created() {
    if (Object.keys(this.$route.query).length)
      this.setRouteQueries(this.$route.query)
    this.$watch(
      (vm) => [
        vm.name,
        vm.method,
        vm.url,
        vm.auth,
        vm.path,
        vm.httpUser,
        vm.httpPassword,
        vm.bearerToken,
        vm.headers,
        vm.params,
        vm.bodyParams,
        vm.contentType,
        vm.rawParams,
      ],
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
