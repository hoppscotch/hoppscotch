import * as HTTPSnippet from "httpsnippet"
import { HoppRESTRequest } from "@hoppscotch/data"
import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { buildHarRequest } from "./har"

// Hoppscotch's Code Generation is Powered by HTTPSnippet (https://github.com/Kong/httpsnippet)
// If you want to add support for your favorite language/library, please contribute to the HTTPSnippet repo <3

/**
 * An array defining all the code generators and their info
 */
export const CodegenDefinitions = [
  {
    name: "c-curl",
    lang: "c",
    mode: "libcurl",
    caption: "C - cURL",
  },
  {
    name: "clojure-clj_http",
    lang: "clojure",
    mode: "clj_http",
    caption: "Clojure - clj-http",
  },
  {
    name: "csharp-httpclient",
    lang: "csharp",
    mode: "httpclient",
    caption: "C# - HttpClient",
  },
  {
    name: "csharp-restsharp",
    lang: "csharp",
    mode: "restsharp",
    caption: "C# - RestSharp",
  },
  {
    name: "go-native",
    lang: "go",
    mode: "native",
    caption: "Go",
  },
  {
    name: "http-http1.1",
    lang: "http",
    mode: "http1.1",
    caption: "HTTP - HTTP 1.1 Request String",
  },
  {
    name: "java-asynchttp",
    lang: "java",
    mode: "asynchttp",
    caption: "Java - AsyncHTTPClient",
  },
  {
    name: "java-nethttp",
    lang: "java",
    mode: "nethttp",
    caption: "Java - java.net.http",
  },
  {
    name: "java-okhttp",
    lang: "java",
    mode: "okhttp",
    caption: "Java - OkHttp",
  },
  {
    name: "java-unirest",
    lang: "java",
    mode: "unirest",
    caption: "Java - Unirest",
  },
  {
    name: "javascript-axios",
    lang: "javascript",
    mode: "axios",
    caption: "JavaScript - Axios",
  },
  {
    name: "javascript-fetch",
    lang: "javascript",
    mode: "fetch",
    caption: "JavaScript - Fetch",
  },
  {
    name: "javascript-jquery",
    lang: "javascript",
    mode: "jquery",
    caption: "JavaScript - jQuery",
  },
  {
    name: "javascript-xhr",
    lang: "javascript",
    mode: "xhr",
    caption: "JavaScript - XMLHttpRequest",
  },
  {
    name: "kotlin-okhttp",
    lang: "kotlin",
    mode: "okhttp",
    caption: "Kotlin - OkHttp",
  },
  {
    name: "objc-nsurlsession",
    lang: "objc",
    mode: "nsurlsession",
    caption: "Objective C - NSURLSession",
  },
  {
    name: "ocaml-cohttp",
    lang: "ocaml",
    mode: "cohttp",
    caption: "OCaml - cohttp",
  },
  {
    name: "php-curl",
    lang: "php",
    mode: "curl",
    caption: "PHP - cURL",
  },
  {
    name: "powershell-restmethod",
    lang: "powershell",
    mode: "restmethod",
    caption: "Powershell - Invoke-RestMethod",
  },
  {
    name: "powershell-webrequest",
    lang: "powershell",
    mode: "webrequest",
    caption: "Powershell - Invoke-WebRequest",
  },
  {
    name: "python-python3",
    lang: "python",
    mode: "python3",
    caption: "Python - Python 3 Native",
  },
  {
    name: "python-requests",
    lang: "python",
    mode: "requests",
    caption: "Python - Requests",
  },
  {
    name: "r-httr",
    lang: "r",
    mode: "httr",
    caption: "R - httr",
  },
  {
    name: "ruby-native",
    lang: "ruby",
    mode: "native",
    caption: "Ruby - Ruby Native",
  },
  {
    name: "shell-curl",
    lang: "shell",
    mode: "curl",
    caption: "Shell - cURL",
  },
  {
    name: "shell-httpie",
    lang: "shell",
    mode: "httpie",
    caption: "Shell - HTTPie",
  },
  {
    name: "shell-wget",
    lang: "shell",
    mode: "wget",
    caption: "Shell - Wget",
  },
  {
    name: "swift-nsurlsession",
    lang: "swift",
    mode: "nsurlsession",
    caption: "Swift - NSURLSession",
  },
] as const

/**
 * A type which defines all the valid code generators
 */
export type CodegenName = (typeof CodegenDefinitions)[number]["name"]

/**
 * Generates Source Code for the given codgen
 * @param codegen The codegen to apply
 * @param req The request to generate using
 * @returns An Option with the generated code snippet
 */
export const generateCode = (
  codegen: CodegenName,
  req: HoppRESTRequest
): O.Option<string> => {
  // Since the Type contract guarantees a match in the array, we are enforcing non-null
  const codegenInfo = CodegenDefinitions.find((v) => v.name === codegen)!

  return pipe(
    E.tryCatch(
      () =>
        new HTTPSnippet({
          ...buildHarRequest(req),
        }).convert(codegenInfo.lang, codegenInfo.mode, {
          indent: "  ",
        }),
      (e) => {
        console.error(e)
        return e
      }
    ),

    // Only allow string output to pass through, else none
    E.chainW(
      E.fromPredicate(
        (val): val is string => typeof val === "string",
        () => "code generator failed" as const
      )
    ),

    O.fromEither
  )
}
