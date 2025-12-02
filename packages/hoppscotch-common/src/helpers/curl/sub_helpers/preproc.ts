import { pipe, flow } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"

/**
 * Hoppscotch cURL preprocessor 개선 버전
 * - Bash multiline "\" 처리
 * - JSON/XML body 보존 (줄바꿈 제거 X)
 * - data/-d/--data-raw 파괴 방지
 */

const replaceables: { [key: string]: string } = {
  "--request": "-X",
  "--header": "-H",
  "--url": "",
  "--form": "-F",
  "--data-raw": "--data",
  "--data": "-d",
  "--data-ascii": "-d",
  "--data-binary": "-d",
  "--user": "-u",
  "--get": "-G",
}

/**
 * ⛔ 원본 Hoppscotch가 문제였던 부분:
 * - 모든 줄바꿈 삭제 → 긴 body 파괴
 * - "\" 줄바꿈 제거 → bash multiline 무시
 *
 * 아래 패치에서는:
 *   ✔ "\"로 끝나는 줄만 다음 줄과 합침
 *   ✔ 일반 줄바꿈은 유지 (JSON/XML 보존)
 */

const fixMultiline = (curl: string) => {
  // "\" 로 끝나는 줄만 다음 줄과 합치기
  const lines = curl.split("\n")
  const merged: string[] = []
  let buffer = ""

  for (let line of lines) {
    const trimmed = line.trimEnd()

    if (trimmed.endsWith("\\")) {
      // 백슬래시 제거하고 다음 줄과 합침
      buffer += trimmed.slice(0, -1) + " "
    } else {
      merged.push(buffer + line)
      buffer = ""
    }
  }

  if (buffer) merged.push(buffer)

  return merged.join("\n")
}

/**
 * 옵션명 축약: --header → -H
 */
const replaceLongOptions = (curlCmd: string) =>
  pipe(Object.keys(replaceables), A.reduce(curlCmd, replaceFunction))

const replaceFunction = (curlCmd: string, r: string) =>
  pipe(
    curlCmd,
    O.fromPredicate(
      () => r.includes("data") || r.includes("form") || r.includes("header")
    ),
    O.map(S.replace(RegExp(`[ \t]${r}(["' ])`, "g"), ` ${replaceables[r]}$1`)),
    O.alt(() =>
      pipe(
        curlCmd,
        S.replace(RegExp(`[ \t]${r}(["' ])`), ` ${replaceables[r]}$1`),
        O.of
      )
    ),
    O.getOrElse(() => "")
  )

/**
 * curl -XPOST → curl -X POST
 */
const prescreenXArgs = flow(
  S.replace(/ -X(GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE)/,
    " -X $1"),
  S.trim
)

/**
 * 최종 Preprocess 함수
 * (body 보존 + multiline 처리 + 옵션 축약)
 */
export const preProcessCurlCommand = (curlCommand: string) =>
  pipe(
    curlCommand,
    O.fromPredicate((curlCmd) => curlCmd.length > 0),
    O.map(fixMultiline),
    O.map(replaceLongOptions),
    O.map(prescreenXArgs),
    O.getOrElse(() => "")
  )
