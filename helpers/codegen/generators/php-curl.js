import { isJSONContentType } from "~/helpers/utils/contenttypes"

export const PhpCurlCodegen = {
  id: "php-curl",
  name: "PHP cURL",
  generator: ({
    url,
    pathName,
    queryString,
    auth,
    httpUser,
    httpPassword,
    bearerToken,
    method,
    rawInput,
    rawParams,
    rawRequestBody,
    contentType,
    headers,
  }) => {
    const requestString = []
    let genHeaders = []

    requestString.push(`<?php\n`)
    requestString.push(`$curl = curl_init();\n`)
    requestString.push(`curl_setopt_array($curl, array(\n`)
    requestString.push(`  CURLOPT_URL => "${url}${pathName}${queryString}",\n`)
    requestString.push(`  CURLOPT_RETURNTRANSFER => true,\n`)
    requestString.push(`  CURLOPT_ENCODING => "",\n`)
    requestString.push(`  CURLOPT_MAXREDIRS => 10,\n`)
    requestString.push(`  CURLOPT_TIMEOUT => 0,\n`)
    requestString.push(`  CURLOPT_FOLLOWLOCATION => true,\n`)
    requestString.push(`  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\n`)
    requestString.push(`  CURLOPT_CUSTOMREQUEST => "${method}",\n`)

    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `    "Authorization: Basic ${window.btoa(unescape(encodeURIComponent(basic)))}",\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(`    "Authorization: Bearer ${bearerToken}",\n`)
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      let requestBody = rawInput ? rawParams : rawRequestBody

      if (
        !isJSONContentType(contentType) &&
        rawInput &&
        !contentType.includes("x-www-form-urlencoded")
      ) {
        const toRemove = /[\n {}]/gim
        const toReplace = /:/gim
        const parts = requestBody.replace(toRemove, "").replace(toReplace, "=>")
        requestBody = `array(${parts})`
      } else if (isJSONContentType(contentType)) {
        requestBody = JSON.stringify(requestBody)
      } else if (contentType.includes("x-www-form-urlencoded")) {
        if (requestBody.includes("=")) {
          requestBody = `"${requestBody}"`
        } else {
          const requestObject = JSON.parse(requestBody)
          requestBody = `"${Object.keys(requestObject)
            .map((key) => `${key}=${requestObject[key].toString()}`)
            .join("&")}"`
        }
      }
      if (contentType) {
        genHeaders.push(`    "Content-Type: ${contentType}; charset=utf-8",\n`)
      }
      requestString.push(`  CURLOPT_POSTFIELDS => ${requestBody},\n`)
    }

    if (headers.length > 0) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`    "${key}: ${value}",\n`)
      })
    }
    if (genHeaders.length > 0 || headers.length > 0) {
      requestString.push(
        `  CURLOPT_HTTPHEADER => array(\n${genHeaders.join("").slice(0, -2)}\n  )\n`
      )
    }

    requestString.push(`));\n`)
    requestString.push(`$response = curl_exec($curl);\n`)
    requestString.push(`curl_close($curl);\n`)
    requestString.push(`echo $response;\n`)

    return requestString.join("")
  },
}
