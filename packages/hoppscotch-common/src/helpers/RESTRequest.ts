import {
  FormDataKeyValue,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTReqBody,
  HoppRESTRequest,
  RESTReqSchemaVersion,
  ValidContentTypes,
} from "@hoppscotch/data"
import { BehaviorSubject, combineLatest, map } from "rxjs"
import { applyBodyTransition } from "~/helpers/rules/BodyTransition"
import { HoppRESTResponse } from "./types/HoppRESTResponse"

export class RESTRequest {
  public v$ = new BehaviorSubject<typeof RESTReqSchemaVersion>(
    RESTReqSchemaVersion
  )
  public name$ = new BehaviorSubject("Untitled")
  public endpoint$ = new BehaviorSubject("https://echo.hoppscotch.io/")
  public params$ = new BehaviorSubject<HoppRESTParam[]>([])
  public headers$ = new BehaviorSubject<HoppRESTHeader[]>([])
  public method$ = new BehaviorSubject("GET")
  public auth$ = new BehaviorSubject<HoppRESTAuth>({
    authType: "none",
    authActive: true,
  })
  public preRequestScript$ = new BehaviorSubject("")
  public testScript$ = new BehaviorSubject("")
  public body$ = new BehaviorSubject<HoppRESTReqBody>({
    contentType: null,
    body: null,
  })

  public response$ = new BehaviorSubject<HoppRESTResponse | null>(null)

  get request$() {
    // any of above changes construct requests
    return combineLatest([
      this.v$,
      this.name$,
      this.endpoint$,
      this.params$,
      this.headers$,
      this.method$,
      this.auth$,
      this.preRequestScript$,
      this.testScript$,
      this.body$,
    ]).pipe(
      map(
        ([
          v,
          name,
          endpoint,
          params,
          headers,
          method,
          auth,
          preRequestScript,
          testScript,
          body,
        ]) => ({
          v,
          name,
          endpoint,
          params,
          headers,
          method,
          auth,
          preRequestScript,
          testScript,
          body,
        })
      )
    )
  }

  get contentType$() {
    return this.body$.pipe(map((body) => body.contentType))
  }

  get bodyContent$() {
    return this.body$.pipe(map((body) => body.body))
  }

  get headersCount$() {
    return this.headers$.pipe(
      map(
        (params) =>
          params.filter((x) => x.active && (x.key !== "" || x.value !== ""))
            .length
      )
    )
  }

  get paramsCount$() {
    return this.params$.pipe(
      map(
        (params) =>
          params.filter((x) => x.active && (x.key !== "" || x.value !== ""))
            .length
      )
    )
  }

  setName(name: string) {
    this.name$.next(name)
  }

  setEndpoint(newURL: string) {
    this.endpoint$.next(newURL)
  }

  setMethod(newMethod: string) {
    this.method$.next(newMethod)
  }

  setParams(entries: HoppRESTParam[]) {
    this.params$.next(entries)
  }

  addParam(newParam: HoppRESTParam) {
    const newParams = this.params$.value.concat(newParam)
    this.params$.next(newParams)
  }

  updateParam(index: number, updatedParam: HoppRESTParam) {
    const newParams = this.params$.value.map((param, i) =>
      i === index ? updatedParam : param
    )
    this.params$.next(newParams)
  }

  deleteParam(index: number) {
    const newParams = this.params$.value.filter((_, i) => i !== index)
    this.params$.next(newParams)
  }

  deleteAllParams() {
    this.params$.next([])
  }

  setHeaders(entries: HoppRESTHeader[]) {
    this.headers$.next(entries)
  }

  addHeader(newHeader: HoppRESTHeader) {
    const newHeaders = this.headers$.value.concat(newHeader)
    this.headers$.next(newHeaders)
  }

  updateHeader(index: number, updatedHeader: HoppRESTHeader) {
    const newHeaders = this.headers$.value.map((header, i) =>
      i === index ? updatedHeader : header
    )
    this.headers$.next(newHeaders)
  }

  deleteHeader(index: number) {
    const newHeaders = this.headers$.value.filter((_, i) => i !== index)
    this.headers$.next(newHeaders)
  }

  deleteAllHeaders() {
    this.headers$.next([])
  }

  setContentType(newContentType: ValidContentTypes | null) {
    // TODO: persist body evenafter switching content typees
    this.body$.next(applyBodyTransition(this.body$.value, newContentType))
  }

  setBody(newBody: string | FormDataKeyValue[] | null) {
    const body = { ...this.body$.value }
    body.body = newBody
    this.body$.next({ ...body })
  }

  addFormDataEntry(entry: FormDataKeyValue) {
    if (this.body$.value.contentType !== "multipart/form-data") return {}
    const body: HoppRESTReqBody = {
      contentType: "multipart/form-data",
      body: [...this.body$.value.body, entry],
    }
    this.body$.next(body)
  }

  deleteFormDataEntry(index: number) {
    // Only perform update if the current content-type is formdata
    if (this.body$.value.contentType !== "multipart/form-data") return {}

    const body: HoppRESTReqBody = {
      contentType: "multipart/form-data",
      body: [...this.body$.value.body.filter((_, i) => i !== index)],
    }

    this.body$.next(body)
  }

  updateFormDataEntry(index: number, entry: FormDataKeyValue) {
    // Only perform update if the current content-type is formdata
    if (this.body$.value.contentType !== "multipart/form-data") return {}

    const body: HoppRESTReqBody = {
      contentType: "multipart/form-data",
      body: [
        ...this.body$.value.body.map((oldEntry, i) =>
          i === index ? entry : oldEntry
        ),
      ],
    }
    this.body$.next(body)
  }

  deleteAllFormDataEntries() {
    // Only perform update if the current content-type is formdata
    if (this.body$.value.contentType !== "multipart/form-data") return {}

    const body: HoppRESTReqBody = {
      contentType: "multipart/form-data",
      body: [],
    }
    this.body$.next(body)
  }

  setRequestBody(newBody: HoppRESTReqBody) {
    this.body$.next(newBody)
  }

  setAuth(newAuth: HoppRESTAuth) {
    this.auth$.next(newAuth)
  }

  setPreRequestScript(newScript: string) {
    this.preRequestScript$.next(newScript)
  }

  setTestScript(newScript: string) {
    this.testScript$.next(newScript)
  }

  updateResponse(response: HoppRESTResponse | null) {
    this.response$.next(response)
  }

  setRequest(request: HoppRESTRequest) {
    this.v$.next(RESTReqSchemaVersion)
    this.name$.next(request.name)
    this.endpoint$.next(request.endpoint)
    this.params$.next(request.params)
    this.headers$.next(request.headers)
    this.method$.next(request.method)
    this.auth$.next(request.auth)
    this.preRequestScript$.next(request.preRequestScript)
    this.testScript$.next(request.testScript)
    this.body$.next(request.body)
  }

  getRequest() {
    return {
      v: this.v$.value,
      name: this.name$.value,
      endpoint: this.endpoint$.value,
      params: this.params$.value,
      headers: this.headers$.value,
      method: this.method$.value,
      auth: this.auth$.value,
      preRequestScript: this.preRequestScript$.value,
      testScript: this.testScript$.value,
      body: this.body$.value,
    }
  }

  resetRequest() {
    this.v$.next(RESTReqSchemaVersion)
    this.name$.next("")
    this.endpoint$.next("")
    this.params$.next([])
    this.headers$.next([])
    this.method$.next("GET")
    this.auth$.next({
      authType: "none",
      authActive: false,
    })
    this.preRequestScript$.next("")
    this.testScript$.next("")
    this.body$.next({
      contentType: null,
      body: null,
    })
  }
}
