const parseHeaders = xhr => {
  const headers = xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)
  const headerMap = {}
  headers.forEach(line => {
    const parts = line.split(': ')
    const header = parts.shift().toLowerCase()
    const value = parts.join(': ')
    headerMap[header] = value
  })
  return headerMap
}
const app = new Vue({
  el: '#app',
  data: {
    method: 'GET',
    url: 'https://yesno.wtf',
    auth: 'None',
    path: '/api',
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
  },
  computed: {

    noHistoryToClear() {
      return this.history.length === 0;
    },

    urlNotValid() {
      const pattern = new RegExp('^(https?:\\/\\/)?' +
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
        '((\\d{1,3}\\.){3}\\d{1,3}))' +
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
        '(\\?[;&a-z\\d%_.~+=-]*)?' +
        '(\\#[-a-z\\d_]*)?$', 'i')
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
        this.response.status = '0'
        this.response.body = 'Error ;('
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
})
