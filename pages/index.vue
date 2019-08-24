<template>
  <div class="page">

    <fieldset class="request" ref="request">
      <legend v-on:click="collapse">Request ↕</legend>
      <div class="collapsible">
        <ul>
          <li>
            <label for="method">Method</label>
            <select v-model="method">
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>OPTIONS</option>
            </select>
          </li>
          <li>
            <label for="url">URL</label>
            <input type="url" v-bind:class="{ error: urlNotValid }" v-model="url" v-on:keyup.enter="sendRequest">
          </li>
          <li>
            <label for="path">Path</label>
            <input v-model="path" v-on:keyup.enter="sendRequest">
          </li>
          <li>
            <label for="action">&nbsp;</label>
            <button v-bind:class="{ disabled: urlNotValid }" name="action" @click="sendRequest">Send</button>
          </li>
        </ul>
      </div>
    </fieldset>
    <fieldset class="reqbody" v-if="method === 'POST' || method === 'PUT'">
      <legend v-on:click="collapse">Request Body ↕</legend>
      <div class="collapsible">
        <ul>
          <li>
            <label>Content Type</label>
            <select v-model="contentType">
              <option>application/json</option>
              <option>www-form/urlencoded</option>
            </select>
          </li>
        </ul>
        <ol v-for="(param, index) in bodyParams">
          <li>
            <label :for="'bparam'+index">Key {{index + 1}}</label>
            <input :name="'bparam'+index" v-model="param.key">
          </li>
          <li>
            <label :for="'bvalue'+index">Value {{index + 1}}</label>
            <input :name="'bvalue'+index" v-model="param.value">
          </li>
          <li>
            <label for="request">&nbsp;</label>
            <button name="request" @click="removeRequestBodyParam(index)">Remove</button>
          </li>
        </ol>
        <ul>
          <li>
            <label for="addrequest">Action</label>
            <button name="addrequest" @click="addRequestBodyParam">Add</button>
          </li>
        </ul>
        <ul>
          <li>
            <label for="request">Parameter List</label>
            <textarea name="request" rows="1" readonly>{{rawRequestBody || '(add at least one parameter)'}}</textarea>
          </li>
        </ul>
      </div>
    </fieldset>
    <fieldset class="authentication hidden">
      <legend v-on:click="collapse">Authentication ↕</legend>
      <div class="collapsible">
        <ul>
          <li>
            <label for="auth">Authentication Type</label>
            <select v-model="auth">
              <option>None</option>
              <option>Basic</option>
              <option>Bearer Token</option>
            </select>
          </li>
        </ul>
        <ul v-if="auth === 'Basic'">
          <li>
            <label for="http_basic_user">User</label>
            <input v-model="httpUser">
          </li>
          <li>
            <label for="http_basic_passwd">Password</label>
            <input v-model="httpPassword" type="password">
          </li>
        </ul>
        <ul v-if="auth === 'Bearer Token'">
          <li>
            <label for="bearer_token">Token</label>
            <input v-model="bearerToken">
          </li>
        </ul>
      </div>
    </fieldset>
    <fieldset class="parameters hidden">
      <legend v-on:click="collapse">Parameters ↕</legend>
      <div class="collapsible">
        <ol v-for="(param, index) in params">
          <li>
            <label :for="'param'+index">Key {{index + 1}}</label>
            <input :name="'param'+index" v-model="param.key">
          </li>
          <li>
            <label :for="'value'+index">Value {{index + 1}}</label>
            <input :name="'value'+index" v-model="param.value">
          </li>
          <li>
            <label for="param">&nbsp;</label>
            <button name="param" @click="removeRequestParam(index)">Remove</button>
          </li>
        </ol>
        <ul>
          <li>
            <label for="add">Action</label>
            <button name="add" @click="addRequestParam">Add</button>
          </li>
        </ul>
        <ul>
          <li>
            <label for="request">Parameter List</label>
            <textarea name="request" rows="1" readonly>{{queryString || '(add at least one parameter)'}}</textarea>
          </li>
        </ul>
      </div>
    </fieldset>
    <fieldset class="response" id="response" ref="response">
      <legend v-on:click="collapse">Response ↕</legend>
      <div class="collapsible">
        <ul>
          <li>
            <label for="status">status</label>
            <input name="status" type="text" readonly :value="response.status || '(waiting to send request)'" :class="statusCategory ? statusCategory.className : ''" >
          </li>
        </ul>
        <ul v-for="(value, key) in response.headers">
          <li>
            <label for="value">{{key}}</label>
            <input name="value" :value="value" readonly>
          </li>
        </ul>
        <ul>
          <li>
            <label for="body">response</label>
            <textarea name="body" rows="10" readonly>{{response.body || '(waiting to send request)'}}</textarea>
          </li>
        </ul>
      </div>
    </fieldset>
    <fieldset class="history">
      <legend v-on:click="collapse">History ↕</legend>
      <div class="collapsible">
        <ul>
          <li>
            <button v-bind:class="{ disabled: noHistoryToClear }" v-on:click="clearHistory">Clear History</button>
          </li>
        </ul>
        <ul v-for="entry in history">
          <li>
            <label for="time">Time</label>
            <input name="time" type="text" readonly :value="entry.time">
          </li>
          <li>
            <label for="name">Method</label>
            <input name="name" type="text" readonly :value="entry.method">
          </li>
          <li>
            <label for="name">URL</label>
            <input name="name" type="text" readonly :value="entry.url">
          </li>
          <li>
            <label for="name">Path</label>
            <input name="name" type="text" readonly :value="entry.path">
          </li>
          <li>
            <label for="delete">&nbsp;</label>
            <button name="delete" @click="deleteHistory(entry)">Delete</button>
          </li>
          <li>
            <label for="use">&nbsp;</label>
            <button name="use" @click="useHistory(entry)">Use</button>
          </li>
        </ul>
      </div>
    </fieldset>

  </div>
</template>

<script>
  const parseHeaders = xhr => {
      const headers = xhr.getAllResponseHeaders().trim().split(/[\r\n]+/);
      const headerMap = {};
      headers.forEach(line => {
          const parts = line.split(': ');
          const header = parts.shift().toLowerCase();
          const value = parts.join(': ');
          headerMap[header] = value
      });
      return headerMap
  };

  export default {
      data () {
          return {
              method: 'GET',
              url: 'https://reqres.in',
              auth: 'None',
              path: '/api/users',
              httpUser: '',
              httpPassword: '',
              bearerToken: '',
              params: [],
              bodyParams: [],
              contentType: 'application/json',
              response: {
                  status: '',
                  headers: '',
                  body: ''
              },
              history: window.localStorage.getItem('history') ? JSON.parse(window.localStorage.getItem('history')) : []
          }
      },
      computed: {
          statusCategory(){
            const statusCategory = [
              {name: 'informational', statusCodeRegex: new RegExp(/[1][0-9]+/), className: 'info-response'},
              {name: 'successful', statusCodeRegex: new RegExp(/[2][0-9]+/), className: 'success-response'},
              {name: 'redirection', statusCodeRegex: new RegExp(/[3][0-9]+/), className: 'redir-response'},
              {name: 'client error', statusCodeRegex: new RegExp(/[4][0-9]+/), className: 'cl-error-response'},
              {name: 'server error', statusCodeRegex: new RegExp(/[5][0-9]+/), className: 'sv-error-response'},
            ].find(status => status.statusCodeRegex.test(this.response.status));

            return statusCategory;
          },
          noHistoryToClear() {
              return this.history.length === 0;
          },
          urlNotValid() {
              const pattern = new RegExp('^(https?:\\/\\/)?' +
                  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
                  '((\\d{1,3}\\.){3}\\d{1,3}))' +
                  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
                  '(\\?[;&a-z\\d%_.~+=-]*)?' +
                  '(\\#[-a-z\\d_]*)?$', 'i');
              return !pattern.test(this.url)
          },
          rawRequestBody() {
              const {
                  bodyParams
              } = this
              if (this.contentType === 'application/json') {
                  try {
                      const obj = JSON.parse(`{${bodyParams.filter(({ key }) => !!key).map(({ key, value }) => `
              "${key}": "${value}"
              `).join()}}`)
                      return JSON.stringify(obj)
                  } catch (ex) {
                      return 'invalid'
                  }
              } else {
                  return bodyParams
                      .filter(({
                                   key
                               }) => !!key)
                      .map(({
                                key,
                                value
                            }) => `${key}=${encodeURIComponent(value)}`).join('&')
              }
          },
          queryString() {
              const result = this.params
                  .filter(({
                               key
                           }) => !!key)
                  .map(({
                            key,
                            value
                        }) => `${key}=${encodeURIComponent(value)}`).join('&')
              return result == '' ? '' : `?${result}`
          }
      },
      methods: {
          deleteHistory(entry) {
              this.history.splice(this.history.indexOf(entry), 1)
              window.localStorage.setItem('history', JSON.stringify(this.history))
          },
          clearHistory() {
              this.history = []
              window.localStorage.setItem('history', JSON.stringify(this.history))
          },
          useHistory({
                         method,
                         url,
                         path
                     }) {
              this.method = method
              this.url = url
              this.path = path
              this.$refs.request.scrollIntoView({
                  behavior: 'smooth'
              })
          },
          collapse({
                       target
                   }) {
              const el = target.parentNode.className
              document.getElementsByClassName(el)[0].classList.toggle('hidden')
          },
          sendRequest() {
              if (this.urlNotValid) {
                  alert('Please check the formatting of the URL')
                  return
              }
              const n = new Date().toLocaleTimeString()
              this.history = [{
                  time: n,
                  method: this.method,
                  url: this.url,
                  path: this.path
              }, ...this.history]
              window.localStorage.setItem('history', JSON.stringify(this.history))
              if (this.$refs.response.classList.contains('hidden')) {
                  this.$refs.response.classList.toggle('hidden')
              }
              this.$refs.response.scrollIntoView({
                  behavior: 'smooth'
              })
              this.response.status = 'Fetching...'
              this.response.body = 'Loading...'
              const xhr = new XMLHttpRequest()
              const user = this.auth === 'Basic' ? this.httpUser : null
              const pswd = this.auth === 'Basic' ? this.httpPassword : null
              xhr.open(this.method, this.url + this.path + this.queryString, true, user, pswd)
              if (this.auth === 'Bearer Token') {
                  xhr.setRequestHeader('Authorization', 'Bearer ' + this.bearerToken);
              }
              if (this.method === 'POST' || this.method === 'PUT') {
                  const requestBody = this.rawRequestBody
                  xhr.setRequestHeader('Content-Length', requestBody.length)
                  xhr.setRequestHeader('Content-Type', `${this.contentType}; charset=utf-8`)
                  xhr.send(requestBody)
              } else {
                  xhr.send()
              }
              xhr.onload = e => {
                  this.response.status = xhr.status
                  const headers = this.response.headers = parseHeaders(xhr)
                  if ((headers['content-type'] || '').startsWith('application/json')) {
                      this.response.body = JSON.stringify(JSON.parse(xhr.responseText), null, 2)
                  } else {
                      this.response.body = xhr.responseText
                  }
              }
              xhr.onerror = e => {
                  this.response.status = xhr.status
                  this.response.body = xhr.statusText
              }
          },
          addRequestParam() {
              this.params.push({
                  key: '',
                  value: ''
              })
              return false
          },
          removeRequestParam(index) {
              this.params.splice(index, 1)
          },
          addRequestBodyParam() {
              this.bodyParams.push({
                  key: '',
                  value: ''
              })
              return false
          },
          removeRequestBodyParam(index) {
              this.bodyParams.splice(index, 1)
          }
      }
  }
</script>
