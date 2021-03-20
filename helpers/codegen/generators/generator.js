export default class Generator {
  constructor() {
    this.requestString = []
    this.joinCharacter = ""
  }

  get defaultGeneratorProperties() {
    return {
      url: "",
      pathName: "",
      queryString: "",
      auth: "",
      httpUser: "",
      httpPassword: "",
      bearerToken: "",
      method: "",
      rawParams: "",
      rawInput: "",
      rawRequestBody: "",
      contentType: "",
      headers: [],
    }
  }

  get isBasicAuthenticationRequest() {
    return ["Basic Auth"].includes(this.auth)
  }

  get isTokenAuthenticationRequest() {
    return ["Bearer Token", "OAuth 2.0"].includes(this.auth)
  }

  get requestAllowsBody() {
    return ["POST", "PUT", "PATCH", "DELETE"].includes(this.method)
  }

  get customRequestHeadersFound() {
    return this.headers
  }

  get requestBody() {
    return this.rawInput ? this.rawParams : this.rawRequestBody
  }

  get contentIsEncoded() {
    return this.contentType.includes("x-www-form-urlencoded")
  }

  resetRequestString() {
    this.requestString = []
  }

  generateRequestString() {
    this.resetRequestString()
    this.populateRequestString()

    return this.requestString.join(this.joinCharacter)
  }

  generator(context) {
    Object.assign(this, this.defaultGeneratorProperties, context)

    return this.generateRequestString()
  }
}
